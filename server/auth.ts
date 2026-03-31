import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import bcrypt from "bcrypt";
import type { Express } from "express";
import * as cookie from "cookie";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { pool } from "./db";
import connectPgSimple from "connect-pg-simple";
import type { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      fullName: string;
      role: string;
      companyId: number | null;
      isActive: boolean;
      profileCompleted: boolean;
    }
  }
}

type AuthTokenPayload = {
  sub: number;
  username: string;
  role: string;
};

function getCookieSettings() {
  const isProduction = process.env.NODE_ENV === "production";
  const secureCookie =
    process.env.SESSION_SECURE === "true"
      ? true
      : process.env.SESSION_SECURE === "false"
        ? false
        : isProduction;
  const sameSite: "lax" | "none" =
    (process.env.SESSION_SAMESITE as "lax" | "none" | undefined) ||
    "none";
  const partitioned =
    process.env.SESSION_PARTITIONED === "true" || isProduction;

  // Partitioned cookies are safest as host-only cookies.
  const domain =
    partitioned ? undefined : (process.env.SESSION_COOKIE_DOMAIN || undefined);
  const name = "sgcc_token";

  return { secureCookie, sameSite, partitioned, domain, name };
}

function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.SESSION_SECRET || "sgcc-dev-only-secret";
}

function signAuthToken(user: Express.User) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role } satisfies AuthTokenPayload,
    getJwtSecret(),
    { expiresIn: "1d" },
  );
}

function verifyAuthToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
}

function buildAuthCookie(token: string, maxAge: number) {
  const { secureCookie, sameSite, partitioned, domain, name } = getCookieSettings();

  return cookie.serialize(name, token, {
    path: "/",
    httpOnly: true,
    secure: secureCookie,
    sameSite,
    partitioned: partitioned || undefined,
    domain,
    maxAge: Math.floor(maxAge / 1000),
  });
}

function buildClearedAuthCookie() {
  const { secureCookie, sameSite, partitioned, domain, name } = getCookieSettings();

  return cookie.serialize(name, "", {
    path: "/",
    httpOnly: true,
    secure: secureCookie,
    sameSite,
    partitioned: partitioned || undefined,
    domain,
    expires: new Date(0),
    maxAge: 0,
  });
}

export function setupAuth(app: Express) {
  const PgStore = connectPgSimple(session);
  const { secureCookie, sameSite, partitioned, domain, name } = getCookieSettings();

  if (!process.env.SESSION_SECRET) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET environment variable is required in production");
    }
    console.warn("WARNING: SESSION_SECRET not set, using default (not safe for production)");
  }

  app.use(
    session({
      name: "sgcc_session",
      proxy: true,
      store: new PgStore({ pool, createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || "sgcc-dev-only-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: secureCookie ? "auto" : false,
        sameSite,
        domain,
        // Needed for Chrome 3rd-party cookie phase-out when embedded in iframe
        partitioned: partitioned || undefined,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.use(async (req, _res, next) => {
    if (req.user) return next();

    const rawCookie = req.headers.cookie;
    if (!rawCookie) return next();

    const token = cookie.parse(rawCookie)[name];
    if (!token) return next();

    try {
      const payload = verifyAuthToken(token);
      const user = await storage.getUser(payload.sub);
      if (!user || !user.isActive) return next();

      req.user = {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        companyId: user.companyId,
        isActive: user.isActive,
        profileCompleted: user.profileCompleted,
      };
    } catch {
      // Ignore invalid or expired auth cookies.
    }

    return next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) return done(null, false, { message: "Username tidak ditemukan" });
        if (!user.isActive) return done(null, false, { message: "Akun tidak aktif" });

        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
          return done(null, false, { message: "Akun terkunci sementara. Coba lagi nanti." });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          const attempts = (user.loginAttempts || 0) + 1;
          const updateData: any = { loginAttempts: attempts };
          if (attempts >= 5) {
            updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
          }
          await storage.updateUser(user.id, updateData);
          return done(null, false, { message: `Password salah. Percobaan ${attempts}/5` });
        }

        await storage.updateUser(user.id, { loginAttempts: 0, lockedUntil: null, lastLogin: new Date() });
        return done(null, {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          companyId: user.companyId,
          isActive: user.isActive,
          profileCompleted: user.profileCompleted,
        });
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) return done(null, false);
      done(null, {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        companyId: user.companyId,
        isActive: user.isActive,
        profileCompleted: user.profileCompleted,
        avatarUrl: user.avatarUrl,
      });
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Login gagal" });

      res.append("Set-Cookie", buildAuthCookie(signAuthToken(user), 24 * 60 * 60 * 1000));
      return res.json(user);
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout gagal" });
      req.session.destroy(() => {
        res.append("Set-Cookie", buildClearedAuthCookie());
        res.json({ message: "Berhasil logout" });
      });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Belum login" });
    res.json(req.user);
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { username, secretAnswer, newPassword } = req.body;
      const user = await storage.getUserByUsername(username);
      if (!user) return res.status(404).json({ message: "Username tidak ditemukan" });
      if (!user.secretQuestion || !user.secretAnswer) {
        return res.status(400).json({ message: "Pertanyaan rahasia belum diatur" });
      }
      const answerMatch = user.secretAnswer.toLowerCase() === secretAnswer.toLowerCase();
      if (!answerMatch) return res.status(400).json({ message: "Jawaban rahasia salah" });

      const hashed = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(user.id, { password: hashed, loginAttempts: 0, lockedUntil: null });
      res.json({ message: "Password berhasil diubah" });
    } catch (err) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.get("/api/auth/secret-question/:username", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user || !user.secretQuestion) {
        return res.status(404).json({ message: "Tidak ditemukan" });
      }
      res.json({ question: user.secretQuestion });
    } catch {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });
}

export function requireAuth(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({ message: "Belum login" });
  if (req.user && req.user.isActive === false) {
    req.logout(() => {});
    return res.status(401).json({ message: "Akun Anda telah dinonaktifkan" });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ message: "Belum login" });
    if (req.user && req.user.isActive === false) {
      req.logout(() => {});
      return res.status(401).json({ message: "Akun Anda telah dinonaktifkan" });
    }
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Akses ditolak" });
    next();
  };
}
