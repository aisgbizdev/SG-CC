import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import bcrypt from "bcrypt";
import type { Express } from "express";
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

export function setupAuth(app: Express) {
  const PgStore = connectPgSimple(session);
  const isProduction = process.env.NODE_ENV === "production";
  // Default: production -> Secure + None + domain; development -> Lax + not secure for localhost testing.
  const secureCookie =
    process.env.SESSION_SECURE === "true"
      ? true
      : process.env.SESSION_SECURE === "false"
        ? false
        : isProduction;
  const sameSite: "lax" | "none" =
    (process.env.SESSION_SAMESITE as "lax" | "none" | undefined) ||
    (isProduction ? "none" : "lax");
  const cookieDomain =
    process.env.SESSION_COOKIE_DOMAIN ||
    (isProduction ? ".newsmaker.id" : undefined);

  if (!process.env.SESSION_SECRET) {
    if (isProduction) {
      throw new Error("SESSION_SECRET environment variable is required in production");
    }
    console.warn("WARNING: SESSION_SECRET not set, using default (not safe for production)");
  }

  app.use(
    session({
      store: new PgStore({ pool, createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || "sgcc-dev-only-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: secureCookie,
        sameSite,
        domain: cookieDomain,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

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
      req.logIn(user, (err) => {
        if (err) return next(err);
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout gagal" });
      res.json({ message: "Berhasil logout" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Belum login" });
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
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Belum login" });
  if (req.user && req.user.isActive === false) {
    req.logout(() => {});
    return res.status(401).json({ message: "Akun Anda telah dinonaktifkan" });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Belum login" });
    if (req.user && req.user.isActive === false) {
      req.logout(() => {});
      return res.status(401).json({ message: "Akun Anda telah dinonaktifkan" });
    }
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Akses ditolak" });
    next();
  };
}
