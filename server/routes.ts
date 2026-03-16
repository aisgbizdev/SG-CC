import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireRole } from "./auth";
import { seedData } from "./seed";
import bcrypt from "bcrypt";
import { z } from "zod";
import webpush from "web-push";
import {
  insertCompanySchema,
  insertMasterCategorySchema,
  insertBranchSchema,
  cases, activities, tasks, announcements, caseMeetings, pushSubscriptions,
} from "@shared/schema";
import { eq, and, or, sql as dsql } from "drizzle-orm";
import { db } from "./db";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "mailto:admin@sgcc.co.id",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

async function notifyAdminsAndOwners(
  companyId: number | null,
  type: string,
  title: string,
  message: string,
  entityType: string | null,
  entityId: number | null,
  excludeUserId: number,
  priority: string = "medium",
) {
  try {
    const allUsers = await storage.getUsers();
    const targets = allUsers.filter(u => {
      if (!u.isActive || u.id === excludeUserId) return false;
      if (u.role === "superadmin") return true;
      if (u.role === "owner") return true;
      return false;
    });
    for (const target of targets) {
      await storage.createNotification({
        userId: target.id, type, title, message,
        entityType, entityId, priority,
      });
      const detailRoutes: Record<string, string> = { case: "/kasus", activity: "/aktivitas" };
      const listRoutes: Record<string, string> = { task: "/tugas", announcement: "/pengumuman", message: "/pesan" };
      const pushUrl = (detailRoutes[entityType || ""] && entityId) ? `${detailRoutes[entityType || ""]}/${entityId}` : listRoutes[entityType || ""] || "/";
      sendPushToUser(target.id, { title, body: message, url: pushUrl });
    }
  } catch (err) {
    console.error("Error notifying admins:", err);
  }
}

async function sendPushToUser(userId: number, payload: { title: string; body: string; url?: string }, options?: { urgency?: "very-low" | "low" | "normal" | "high" }) {
  try {
    const subs = await storage.getPushSubscriptions(userId);
    const pushOptions: webpush.RequestOptions = {};
    if (options?.urgency) {
      pushOptions.urgency = options.urgency;
    }
    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          pushOptions,
        ).catch(async (err: any) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await storage.deletePushSubscription(sub.endpoint);
          }
        })
      )
    );
    return results;
  } catch (err) {
    console.error("Push notification error:", err);
  }
}

const createUserSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  fullName: z.string().min(1, "Nama lengkap wajib diisi"),
  role: z.string().min(1, "Role wajib diisi"),
  companyId: z.number().int().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  branchCount: z.number().int().optional().nullable(),
  position: z.string().optional().nullable(),
  profileCompleted: z.boolean().optional(),
  secretQuestion: z.string().optional().nullable(),
  secretAnswer: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const activityBodySchema = z.object({
  companyId: z.number().int().optional(),
  date: z.string().min(1, "Tanggal wajib diisi"),
  categoryId: z.number().int().optional().nullable(),
  title: z.string().min(1, "Judul wajib diisi"),
  description: z.string().optional().nullable(),
  result: z.string().optional().nullable(),
  status: z.string().optional(),
  priority: z.string().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  targetDate: z.string().optional().nullable(),
  nextAction: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
const activityPatchSchema = activityBodySchema.partial();

const caseBodySchema = z.object({
  companyId: z.number().int().optional(),
  caseCode: z.string().min(1, "Kode kasus wajib diisi"),
  branch: z.string().optional().nullable(),
  dateReceived: z.string().min(1, "Tanggal terima wajib diisi"),
  customerName: z.string().min(1, "Nama nasabah wajib diisi"),
  accountNumber: z.string().optional().nullable(),
  picMain: z.string().optional().nullable(),
  bucket: z.string().optional(),
  status: z.string().optional(),
  summary: z.string().min(1, "Ringkasan wajib diisi"),
  riskLevel: z.string().optional(),
  priority: z.string().optional(),
  workflowStage: z.string().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  targetDate: z.string().optional().nullable(),
  findings: z.string().optional().nullable(),
  rootCause: z.string().optional().nullable(),
  customerRequest: z.string().optional().nullable(),
  companyOffer: z.string().optional().nullable(),
  settlementResult: z.string().optional().nullable(),
  latestAction: z.string().optional().nullable(),
  nextAction: z.string().optional().nullable(),
  ownerNote: z.string().optional().nullable(),
  duNote: z.string().optional().nullable(),
  dkNote: z.string().optional().nullable(),
  wpbName: z.string().optional().nullable(),
  managerName: z.string().optional().nullable(),
  resolutionPath: z.string().optional(),
});
const casePatchSchema = caseBodySchema.partial();

const caseUpdateBodySchema = z.object({
  content: z.string().min(1, "Konten update wajib diisi"),
  newStage: z.string().optional(),
  newProgress: z.number().int().min(0).max(100).optional(),
});

const taskBodySchema = z.object({
  companyId: z.number().int().optional().nullable(),
  assignedTo: z.number({ message: "Penanggung jawab wajib diisi" }).int(),
  title: z.string().min(1, "Judul wajib diisi"),
  description: z.string().optional().nullable(),
  priority: z.string().optional(),
  status: z.string().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  deadline: z.string().optional().nullable(),
  relatedCaseId: z.number().int().optional().nullable(),
  relatedActivityId: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});
const taskPatchSchema = taskBodySchema.partial();
const taskDuDkPatchSchema = z.object({
  status: z.string().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  notes: z.string().optional(),
});

const announcementBodySchema = z.object({
  title: z.string().min(1, "Judul wajib diisi"),
  content: z.string().min(1, "Konten wajib diisi"),
  priority: z.string().optional(),
  targetType: z.string().optional(),
  targetValue: z.string().optional().nullable(),
  startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
  endDate: z.string().optional().nullable(),
  isPinned: z.boolean().optional(),
});

const commentBodySchema = z.object({
  entityType: z.enum(["activity", "case", "task"]),
  entityId: z.number().int(),
  content: z.string().min(1, "Komentar wajib diisi"),
  parentId: z.number().int().optional().nullable(),
});

const messageBodySchema = z.object({
  receiverId: z.number().int(),
  subject: z.string().optional().nullable(),
  content: z.string().min(1, "Pesan wajib diisi"),
  tag: z.enum(["perlu_arahan"]).optional().nullable(),
});

const profilePatchSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  branchCount: z.number().int().optional().nullable(),
  position: z.string().optional().nullable(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password minimal 8 karakter"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password lama wajib diisi"),
  newPassword: z.string().min(8, "Password minimal 8 karakter"),
});

function formatZodError(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    fieldErrors[path || "_root"] = issue.message;
  }
  return { message: "Validasi gagal", errors: fieldErrors };
}

function parsePagination(query: any): { page: number; limit: number; offset: number } | null {
  if (!query.page && !query.limit) return null;
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

function paginateArray<T>(data: T[], pagination: { page: number; limit: number; offset: number } | null) {
  if (!pagination) return data;
  const total = data.length;
  const paged = data.slice(pagination.offset, pagination.offset + pagination.limit);
  return { data: paged, total, page: pagination.page, limit: pagination.limit };
}

function canAccessCompany(user: any, companyId: number | null): boolean {
  if (["superadmin", "owner"].includes(user.role)) return true;
  return user.companyId === companyId;
}

function parseId(param: string): number | null {
  if (!/^\d+$/.test(param)) return null;
  return parseInt(param);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);
  await seedData();

  app.get("/api/companies", requireAuth, async (_req, res) => {
    try {
      const data = await storage.getCompanies();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil data perusahaan" });
    }
  });

  app.post("/api/companies", requireRole("superadmin"), async (req, res) => {
    try {
      const parsed = insertCompanySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));
      const company = await storage.createCompany(parsed.data);
      res.json(company);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal membuat PT" });
    }
  });

  app.get("/api/companies/:id", requireRole("superadmin"), async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) return res.status(400).json({ message: "ID tidak valid" });
      const company = await storage.getCompany(id);
      if (!company) return res.status(404).json({ message: "PT tidak ditemukan" });

      const branchList = await storage.getBranchesByCompany(id);
      const userList = await storage.getUsersByCompany(id);
      const safeUsers = userList.map(({ password, secretAnswer, ...u }: any) => u);

      const caseRows = await db.select({
        branch: cases.branch,
        status: cases.status,
      }).from(cases).where(and(eq(cases.companyId, id), eq(cases.isArchived, false)));

      const caseRekap: Record<string, { total: number; open: number; closed: number; inProgress: number }> = {};
      for (const c of caseRows) {
        const b = c.branch || "Tidak diketahui";
        if (!caseRekap[b]) caseRekap[b] = { total: 0, open: 0, closed: 0, inProgress: 0 };
        caseRekap[b].total++;
        if (c.status === "Open") caseRekap[b].open++;
        else if (c.status === "Closed") caseRekap[b].closed++;
        else caseRekap[b].inProgress++;
      }

      const activityRows = await db.select().from(activities).where(and(eq(activities.companyId, id), eq(activities.isArchived, false)));
      const taskRows = await db.select().from(tasks).where(and(eq(tasks.companyId, id), eq(tasks.isArchived, false)));
      const announcementRows = await db.select().from(announcements).where(
        and(
          eq(announcements.isArchived, false),
          or(
            eq(announcements.targetType, "all"),
            and(eq(announcements.targetType, "company"), eq(announcements.targetValue, String(id)))
          )
        )
      );

      const rekapAktivitas = { total: activityRows.length };
      const rekapTugas = {
        total: taskRows.length,
        selesai: taskRows.filter((t: any) => t.status === "Selesai").length,
        belumSelesai: taskRows.filter((t: any) => t.status !== "Selesai").length,
      };
      const rekapPengumuman = { total: announcementRows.length };

      res.json({
        company,
        branches: branchList,
        users: safeUsers,
        rekapKasus: caseRekap,
        rekapAktivitas,
        rekapTugas,
        rekapPengumuman,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil detail PT" });
    }
  });

  app.patch("/api/companies/:id", requireRole("superadmin"), async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) return res.status(400).json({ message: "ID tidak valid" });
      const updateSchema = insertCompanySchema.partial();
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));
      const company = await storage.updateCompany(id, parsed.data);
      if (!company) return res.status(404).json({ message: "PT tidak ditemukan" });
      res.json(company);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal mengupdate PT" });
    }
  });

  app.get("/api/companies/:id/branches", requireAuth, async (req, res) => {
    try {
      const companyId = parseId(req.params.id);
      if (companyId === null) return res.status(400).json({ message: "ID tidak valid" });
      const user = req.user as any;
      if (!canAccessCompany(user, companyId)) return res.status(403).json({ message: "Akses ditolak" });
      const branchList = await storage.getBranchesByCompany(companyId);
      res.json(branchList);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil data cabang" });
    }
  });

  app.post("/api/companies/:id/branches", requireRole("superadmin"), async (req, res) => {
    try {
      const companyId = parseId(req.params.id);
      if (companyId === null) return res.status(400).json({ message: "ID tidak valid" });
      const parsed = insertBranchSchema.safeParse({ ...req.body, companyId });
      if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));
      const branch = await storage.createBranch(parsed.data);
      res.json(branch);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal menambah cabang" });
    }
  });

  app.patch("/api/branches/:id", requireRole("superadmin"), async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) return res.status(400).json({ message: "ID tidak valid" });
      const branch = await storage.updateBranch(id, req.body);
      if (!branch) return res.status(404).json({ message: "Cabang tidak ditemukan" });
      res.json(branch);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal mengupdate cabang" });
    }
  });

  app.delete("/api/branches/:id", requireRole("superadmin"), async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) return res.status(400).json({ message: "ID tidak valid" });
      await storage.deleteBranch(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal menghapus cabang" });
    }
  });

  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const data = await storage.getUsers();
      const safe = data.map(({ password, secretAnswer, ...u }) => u);
      if (["superadmin", "owner"].includes(user.role)) {
        return res.json(safe);
      }
      return res.json(safe.filter((u: any) => u.companyId === user.companyId || ["superadmin", "owner"].includes(u.role)));
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil data user" });
    }
  });

  app.post("/api/users", requireRole("superadmin"), async (req, res) => {
    try {
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));
      const { password, ...rest } = parsed.data;
      const hashed = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ ...rest, password: hashed });
      const { password: _, secretAnswer: __, ...safe } = user;
      res.json(safe);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal membuat user" });
    }
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user as any;
      const id = parseInt(req.params.id);
      if (currentUser.role !== "superadmin" && currentUser.id !== id) {
        return res.status(403).json({ message: "Akses ditolak" });
      }
      const updateData = { ...req.body };
      if (currentUser.role !== "superadmin") {
        delete updateData.role;
        delete updateData.companyId;
        delete updateData.isActive;
      }
      if (updateData.isActive !== undefined && currentUser.role === "superadmin") {
        if (id === currentUser.id) {
          return res.status(400).json({ message: "Tidak bisa menonaktifkan akun sendiri" });
        }
        const targetUser = await storage.getUser(id);
        if (targetUser && targetUser.role === "superadmin") {
          return res.status(400).json({ message: "Tidak bisa menonaktifkan superadmin lain" });
        }
      }
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }
      const user = await storage.updateUser(id, updateData);
      if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
      const { password: _, secretAnswer: __, ...safe } = user;
      res.json(safe);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal update user" });
    }
  });

  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const companyId = ["superadmin", "owner"].includes(user.role) ? undefined : user.companyId;
      const stats = await storage.getDashboardStats(companyId);
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil data dashboard" });
    }
  });

  app.get("/api/categories", requireAuth, async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      const data = await storage.getCategories(type);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil data kategori" });
    }
  });

  app.post("/api/categories", requireRole("superadmin"), async (req, res) => {
    try {
      const parsed = insertMasterCategorySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));
      const cat = await storage.createCategory(parsed.data);
      res.json(cat);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal membuat kategori" });
    }
  });

  app.get("/api/activities", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const companyId = ["superadmin", "owner"].includes(user.role) ? undefined : user.companyId;
      const data = await storage.getActivities(companyId);
      const pagination = parsePagination(req.query);
      res.json(paginateArray(data, pagination));
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil data aktivitas" });
    }
  });

  app.get("/api/activities/:id", requireAuth, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID tidak valid" });
      const user = req.user as any;
      const activity = await storage.getActivity(id);
      if (!activity) return res.status(404).json({ message: "Aktivitas tidak ditemukan" });
      if (!canAccessCompany(user, activity.companyId)) return res.status(403).json({ message: "Akses ditolak" });
      res.json(activity);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil data aktivitas" });
    }
  });

  app.post("/api/activities", requireRole("superadmin", "du", "dk"), async (req, res) => {
    try {
      const parsed = activityBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));
      const user = req.user as any;
      const activity = await storage.transaction(async (tx) => {
        const act = await storage.createActivity({
          ...parsed.data,
          createdBy: user.id,
          companyId: parsed.data.companyId || user.companyId,
        }, tx);
        await storage.createAuditLog({ userId: user.id, action: "create", entityType: "activity", entityId: act.id, details: `Membuat aktivitas: ${act.title}` }, tx);
        return act;
      });
      notifyAdminsAndOwners(activity.companyId, "new_activity", "Aktivitas Baru", `${user.fullName} membuat aktivitas: ${activity.title}`, "activity", activity.id, user.id);
      res.json(activity);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal membuat aktivitas" });
    }
  });

  app.patch("/api/activities/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const existing = await storage.getActivity(parseInt(req.params.id));
      if (!existing) return res.status(404).json({ message: "Aktivitas tidak ditemukan" });
      if (!canAccessCompany(user, existing.companyId)) return res.status(403).json({ message: "Akses ditolak" });
      if (user.role !== "superadmin" && existing.createdBy !== user.id) {
        return res.status(403).json({ message: "Hanya pembuat atau superadmin yang bisa mengedit" });
      }
      const patchParsed = activityPatchSchema.safeParse(req.body);
      if (!patchParsed.success) return res.status(400).json(formatZodError(patchParsed.error));
      const activity = await storage.transaction(async (tx) => {
        const act = await storage.updateActivity(existing.id, patchParsed.data, tx);
        await storage.createAuditLog({ userId: user.id, action: "update", entityType: "activity", entityId: existing.id, details: `Mengupdate aktivitas: ${existing.title}` }, tx);
        return act;
      });
      notifyAdminsAndOwners(existing.companyId, "activity_updated", "Aktivitas Diperbarui", `${user.fullName} memperbarui aktivitas: ${existing.title}`, "activity", existing.id, user.id);
      res.json(activity);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal update aktivitas" });
    }
  });

  app.delete("/api/activities/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const existing = await storage.getActivity(parseInt(req.params.id));
      if (!existing) return res.status(404).json({ message: "Aktivitas tidak ditemukan" });
      if (!canAccessCompany(user, existing.companyId)) return res.status(403).json({ message: "Akses ditolak" });
      if (!["superadmin", "owner"].includes(user.role) && existing.createdBy !== user.id) {
        return res.status(403).json({ message: "Hanya pembuat, owner, atau superadmin yang bisa menghapus" });
      }
      await storage.transaction(async (tx) => {
        await storage.updateActivity(existing.id, { isArchived: true }, tx);
        await storage.createAuditLog({ userId: user.id, action: "delete", entityType: "activity", entityId: existing.id, details: `Menghapus aktivitas: ${existing.title}` }, tx);
      });
      res.json({ message: "Aktivitas berhasil dihapus" });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal menghapus aktivitas" });
    }
  });

  app.get("/api/cases", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const companyId = ["superadmin", "owner"].includes(user.role) ? undefined : user.companyId;
      const data = await storage.getCases(companyId);
      const pagination = parsePagination(req.query);
      res.json(paginateArray(data, pagination));
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil data kasus" });
    }
  });

  app.get("/api/cases/:id", requireAuth, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID tidak valid" });
      const user = req.user as any;
      const c = await storage.getCase(id);
      if (!c) return res.status(404).json({ message: "Kasus tidak ditemukan" });
      if (!canAccessCompany(user, c.companyId)) return res.status(403).json({ message: "Akses ditolak" });
      res.json(c);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil data kasus" });
    }
  });

  app.post("/api/cases", requireRole("superadmin", "du", "dk"), async (req, res) => {
    try {
      const parsed = caseBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));
      const user = req.user as any;
      const c = await storage.transaction(async (tx) => {
        const newCase = await storage.createCase({ ...parsed.data, createdBy: user.id, companyId: parsed.data.companyId || user.companyId }, tx);
        await storage.createAuditLog({ userId: user.id, action: "create", entityType: "case", entityId: newCase.id, details: `Membuat kasus: ${newCase.caseCode}` }, tx);
        return newCase;
      });
      notifyAdminsAndOwners(c.companyId, "new_case", "Kasus Pengaduan Baru", `${user.fullName} membuat kasus: ${c.caseCode}`, "case", c.id, user.id);
      res.json(c);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal membuat kasus" });
    }
  });

  app.patch("/api/cases/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const existing = await storage.getCase(parseInt(req.params.id));
      if (!existing) return res.status(404).json({ message: "Kasus tidak ditemukan" });
      if (!canAccessCompany(user, existing.companyId)) return res.status(403).json({ message: "Akses ditolak" });
      if (user.role !== "superadmin" && existing.createdBy !== user.id) {
        return res.status(403).json({ message: "Hanya pembuat atau superadmin yang bisa mengedit" });
      }
      const casePatchParsed = casePatchSchema.safeParse(req.body);
      if (!casePatchParsed.success) return res.status(400).json(formatZodError(casePatchParsed.error));
      const c = await storage.transaction(async (tx) => {
        const updated = await storage.updateCase(existing.id, casePatchParsed.data, tx);
        await storage.createAuditLog({ userId: user.id, action: "update", entityType: "case", entityId: existing.id, details: `Mengupdate kasus: ${existing.caseCode}` }, tx);
        return updated;
      });
      notifyAdminsAndOwners(existing.companyId, "case_updated", "Kasus Diperbarui", `${user.fullName} memperbarui kasus: ${existing.caseCode}`, "case", existing.id, user.id);
      if (casePatchParsed.data.riskLevel === "High" && existing.riskLevel !== "High") {
        notifyAdminsAndOwners(existing.companyId, "case_high_risk", "Kasus Risiko Tinggi", `Kasus ${existing.caseCode} dinaikkan ke risiko TINGGI oleh ${user.fullName}`, "case", existing.id, user.id, "high");
      }
      if (casePatchParsed.data.progress === 100 && existing.progress !== 100) {
        notifyAdminsAndOwners(existing.companyId, "case_completed", "Kasus Selesai", `Kasus ${existing.caseCode} telah mencapai 100% oleh ${user.fullName}`, "case", existing.id, user.id);
      }
      res.json(c);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal update kasus" });
    }
  });

  app.delete("/api/cases/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const existing = await storage.getCase(parseInt(req.params.id));
      if (!existing) return res.status(404).json({ message: "Kasus tidak ditemukan" });
      if (!canAccessCompany(user, existing.companyId)) return res.status(403).json({ message: "Akses ditolak" });
      if (!["superadmin", "owner"].includes(user.role) && existing.createdBy !== user.id) {
        return res.status(403).json({ message: "Hanya pembuat, owner, atau superadmin yang bisa menghapus" });
      }
      await storage.transaction(async (tx) => {
        await storage.updateCase(existing.id, { isArchived: true }, tx);
        await storage.createAuditLog({ userId: user.id, action: "delete", entityType: "case", entityId: existing.id, details: `Menghapus kasus: ${existing.caseCode}` }, tx);
      });
      res.json({ message: "Kasus berhasil dihapus" });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal menghapus kasus" });
    }
  });

  app.get("/api/cases/:id/updates", requireAuth, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID tidak valid" });
      const user = req.user as any;
      const c = await storage.getCase(id);
      if (!c) return res.status(404).json({ message: "Kasus tidak ditemukan" });
      if (!canAccessCompany(user, c.companyId)) return res.status(403).json({ message: "Akses ditolak" });
      const data = await storage.getCaseUpdates(c.id);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil data update kasus" });
    }
  });

  app.post("/api/cases/:id/updates", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const caseId = parseInt(req.params.id);
      const c = await storage.getCase(caseId);
      if (!c) return res.status(404).json({ message: "Kasus tidak ditemukan" });
      if (!canAccessCompany(user, c.companyId)) return res.status(403).json({ message: "Akses ditolak" });
      const cuParsed = caseUpdateBodySchema.safeParse(req.body);
      if (!cuParsed.success) return res.status(400).json(formatZodError(cuParsed.error));
      const update = await storage.transaction(async (tx) => {
        const upd = await storage.createCaseUpdate({ ...cuParsed.data, caseId, createdBy: user.id }, tx);
        if (cuParsed.data.newStage || cuParsed.data.newProgress !== undefined) {
          const updateData: any = {};
          if (cuParsed.data.newStage) updateData.workflowStage = cuParsed.data.newStage;
          if (cuParsed.data.newProgress !== undefined) updateData.progress = cuParsed.data.newProgress;
          await storage.updateCase(caseId, updateData, tx);
        }
        return upd;
      });
      res.json(update);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal menambah update" });
    }
  });

  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      let filters: any = {};
      if (["du", "dk"].includes(user.role)) {
        filters.assignedTo = user.id;
      }
      const data = await storage.getTasks(filters);
      const pagination = parsePagination(req.query);
      res.json(paginateArray(data, pagination));
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil data tugas" });
    }
  });

  app.get("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID tidak valid" });
      const user = req.user as any;
      const task = await storage.getTask(id);
      if (!task) return res.status(404).json({ message: "Tugas tidak ditemukan" });
      if (["du", "dk"].includes(user.role) && task.assignedTo !== user.id) {
        return res.status(403).json({ message: "Akses ditolak" });
      }
      res.json(task);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil data tugas" });
    }
  });

  app.post("/api/tasks", requireRole("superadmin", "owner"), async (req, res) => {
    try {
      const parsed = taskBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));
      const user = req.user as any;
      const task = await storage.transaction(async (tx) => {
        const t = await storage.createTask({ ...parsed.data, createdBy: user.id }, tx);
        await storage.createNotification({ userId: t.assignedTo, type: "task_assigned", title: "Tugas Baru", message: `Anda mendapat tugas baru: ${t.title}`, entityType: "task", entityId: t.id, priority: t.priority === "High" ? "high" : "medium" }, tx);
        await storage.createAuditLog({ userId: user.id, action: "create", entityType: "task", entityId: t.id, details: `Membuat tugas: ${t.title}` }, tx);
        return t;
      });
      sendPushToUser(task.assignedTo, { title: "Tugas Baru", body: `Anda mendapat tugas baru: ${task.title}`, url: "/tugas" });
      res.json(task);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal membuat tugas" });
    }
  });

  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const existing = await storage.getTask(parseInt(req.params.id));
      if (!existing) return res.status(404).json({ message: "Tugas tidak ditemukan" });
      if (["du", "dk"].includes(user.role) && existing.assignedTo !== user.id) {
        return res.status(403).json({ message: "Akses ditolak" });
      }
      if (["du", "dk"].includes(user.role)) {
        const duDkParsed = taskDuDkPatchSchema.safeParse(req.body);
        if (!duDkParsed.success) return res.status(400).json(formatZodError(duDkParsed.error));
        const task = await storage.updateTask(existing.id, duDkParsed.data);
        notifyAdminsAndOwners(existing.companyId, "task_updated", "Tugas Diperbarui", `${user.fullName} memperbarui tugas: ${existing.title}`, "task", existing.id, user.id);
        if (duDkParsed.data.progress === 100 && existing.progress !== 100) {
          notifyAdminsAndOwners(existing.companyId, "task_completed", "Tugas Selesai", `${user.fullName} menyelesaikan tugas: ${existing.title}`, "task", existing.id, user.id);
        }
        return res.json(task);
      }
      const taskPatchParsed = taskPatchSchema.safeParse(req.body);
      if (!taskPatchParsed.success) return res.status(400).json(formatZodError(taskPatchParsed.error));
      const task = await storage.updateTask(existing.id, taskPatchParsed.data);
      if (taskPatchParsed.data.assignedTo && taskPatchParsed.data.assignedTo !== existing.assignedTo) {
        await storage.createNotification({ userId: taskPatchParsed.data.assignedTo, type: "task_assigned", title: "Tugas Baru", message: `Anda mendapat tugas baru: ${existing.title}`, entityType: "task", entityId: existing.id, priority: existing.priority === "High" ? "high" : "medium" });
        sendPushToUser(taskPatchParsed.data.assignedTo, { title: "Tugas Baru", body: `Anda mendapat tugas baru: ${existing.title}`, url: "/tugas" });
      }
      res.json(task);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal update tugas" });
    }
  });

  app.delete("/api/tasks/:id", requireRole("superadmin", "owner"), async (req, res) => {
    try {
      const user = req.user as any;
      const existing = await storage.getTask(parseInt(req.params.id));
      if (!existing) return res.status(404).json({ message: "Tugas tidak ditemukan" });
      if (!canAccessCompany(user, existing.companyId)) return res.status(403).json({ message: "Akses ditolak" });
      await storage.transaction(async (tx) => {
        await storage.updateTask(existing.id, { isArchived: true }, tx);
        await storage.createAuditLog({ userId: user.id, action: "delete", entityType: "task", entityId: existing.id, details: `Menghapus tugas: ${existing.title}` }, tx);
      });
      res.json({ message: "Tugas berhasil dihapus" });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal menghapus tugas" });
    }
  });

  app.get("/api/announcements", requireAuth, async (req, res) => {
    try {
      const data = await storage.getAnnouncements();
      const pagination = parsePagination(req.query);
      res.json(paginateArray(data, pagination));
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil data pengumuman" });
    }
  });

  app.post("/api/announcements", requireRole("superadmin", "owner"), async (req, res) => {
    try {
      const parsed = announcementBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));
      const user = req.user as any;
      const ann = await storage.createAnnouncement({ ...parsed.data, createdBy: user.id });
      const allUsers = await storage.getUsers();
      let targetUsers = allUsers.filter(u => u.isActive && u.id !== user.id);
      if (parsed.data.targetType === "users" && parsed.data.targetValue) {
        const targetIds = new Set(parsed.data.targetValue.split(",").map((id: string) => parseInt(id.trim())));
        targetUsers = targetUsers.filter(u => targetIds.has(u.id));
      }
      for (const u of targetUsers) {
        await storage.createNotification({ userId: u.id, type: "new_announcement", title: "Pengumuman Baru", message: ann.title, entityType: "announcement", entityId: ann.id, priority: "medium" });
        sendPushToUser(u.id, { title: "Pengumuman Baru", body: ann.title, url: "/pengumuman" });
      }
      res.json(ann);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal membuat pengumuman" });
    }
  });

  app.patch("/api/announcements/:id", requireRole("superadmin", "owner"), async (req, res) => {
    try {
      const user = req.user as any;
      const existing = await storage.getAnnouncement(parseInt(req.params.id));
      if (!existing) return res.status(404).json({ message: "Pengumuman tidak ditemukan" });
      if (user.role !== "superadmin" && existing.createdBy !== user.id) {
        return res.status(403).json({ message: "Hanya pembuat atau superadmin yang bisa mengedit" });
      }
      const parsed = announcementBodySchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));
      const ann = await storage.updateAnnouncement(existing.id, parsed.data);
      res.json(ann);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal mengupdate pengumuman" });
    }
  });

  app.delete("/api/announcements/:id", requireRole("superadmin", "owner"), async (req, res) => {
    try {
      const user = req.user as any;
      const existing = await storage.getAnnouncement(parseInt(req.params.id));
      if (!existing) return res.status(404).json({ message: "Pengumuman tidak ditemukan" });
      if (user.role !== "superadmin" && existing.createdBy !== user.id) {
        return res.status(403).json({ message: "Hanya pembuat atau superadmin yang bisa menghapus" });
      }
      await storage.updateAnnouncement(existing.id, { isArchived: true } as any);
      res.json({ message: "Pengumuman berhasil dihapus" });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal menghapus pengumuman" });
    }
  });

  app.get("/api/announcements/:id/reads", requireAuth, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID tidak valid" });
      const reads = await storage.getAnnouncementReads(id);
      res.json(reads);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil data" });
    }
  });

  app.post("/api/announcements/:id/read", requireAuth, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID tidak valid" });
      const user = req.user as any;
      const read = await storage.markAnnouncementRead({ announcementId: id, userId: user.id });
      res.json(read);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal menandai pengumuman" });
    }
  });

  app.get("/api/comments/:entityType/:entityId", requireAuth, async (req, res) => {
    try {
      const entityId = parseId(req.params.entityId);
      if (!entityId) return res.status(400).json({ message: "ID tidak valid" });
      const data = await storage.getComments(req.params.entityType, entityId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil komentar" });
    }
  });

  app.post("/api/comments", requireAuth, async (req, res) => {
    try {
      const parsed = commentBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));
      const user = req.user as any;
      const comment = await storage.createComment({ ...parsed.data, createdBy: user.id });
      const entityType = parsed.data.entityType;
      const entityId = parsed.data.entityId;
      let companyId: number | null = null;
      let entityTitle = "";
      if (entityType === "case") {
        const entity = await storage.getCase(entityId);
        if (entity) { companyId = entity.companyId; entityTitle = entity.caseCode; }
      } else if (entityType === "activity") {
        const entity = await storage.getActivity(entityId);
        if (entity) { companyId = entity.companyId; entityTitle = entity.title; }
      } else if (entityType === "task") {
        const entity = await storage.getTask(entityId);
        if (entity) { companyId = entity.companyId; entityTitle = entity.title; }
      }
      notifyAdminsAndOwners(companyId, "new_comment", "Komentar Baru", `${user.fullName} mengomentari ${entityType === "case" ? "kasus" : entityType === "activity" ? "aktivitas" : "tugas"}: ${entityTitle}`, entityType, entityId, user.id);
      res.json(comment);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal menambah komentar" });
    }
  });

  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const data = await storage.getNotifications(user.id);
      const pagination = parsePagination(req.query);
      res.json(paginateArray(data, pagination));
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil notifikasi" });
    }
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const count = await storage.getUnreadNotificationCount(user.id);
      res.json({ count });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil jumlah notifikasi" });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID tidak valid" });
      const user = req.user as any;
      const notification = await storage.getNotification(id);
      if (!notification) return res.status(404).json({ message: "Notifikasi tidak ditemukan" });
      if (notification.userId !== user.id) return res.status(403).json({ message: "Akses ditolak" });
      await storage.markNotificationRead(notification.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal menandai notifikasi" });
    }
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      await storage.markAllNotificationsRead(user.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal menandai semua notifikasi" });
    }
  });

  app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID tidak valid" });
      const user = req.user as any;
      const notification = await storage.getNotification(id);
      if (!notification) return res.status(404).json({ message: "Notifikasi tidak ditemukan" });
      if (notification.userId !== user.id) return res.status(403).json({ message: "Akses ditolak" });
      await storage.deleteNotification(id, user.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal menghapus notifikasi" });
    }
  });

  app.delete("/api/notifications/batch/read", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const deleted = await storage.deleteReadNotifications(user.id);
      res.json({ success: true, deleted });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal menghapus notifikasi" });
    }
  });

  app.delete("/api/notifications/batch/all", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const deleted = await storage.deleteAllNotifications(user.id);
      res.json({ success: true, deleted });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal menghapus notifikasi" });
    }
  });

  app.get("/api/push/vapid-key", (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
  });

  app.post("/api/push/subscribe", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ message: "Invalid subscription data" });
      }
      const sub = await storage.savePushSubscription(user.id, endpoint, keys.p256dh, keys.auth);
      res.json({ success: true, id: sub.id });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal menyimpan subscription" });
    }
  });

  app.delete("/api/push/subscribe", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { endpoint } = req.body;
      if (endpoint) {
        await storage.deletePushSubscriptionByUser(user.id, endpoint);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal menghapus subscription" });
    }
  });

  app.get("/api/messages", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const data = await storage.getMessages(user.id);
      const pagination = parsePagination(req.query);
      res.json(paginateArray(data, pagination));
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil pesan" });
    }
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const parsed = messageBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));
      const user = req.user as any;
      const isPerluArahan = parsed.data.tag === "perlu_arahan";
      const notifTitle = isPerluArahan ? "Pesan Perlu Arahan" : "Pesan Baru";
      const notifPriority = isPerluArahan ? "high" : "medium";
      const msg = await storage.transaction(async (tx) => {
        const m = await storage.createMessage({ ...parsed.data, senderId: user.id }, tx);
        await storage.createNotification({ userId: m.receiverId, type: "new_message", title: notifTitle, message: `Anda mendapat ${isPerluArahan ? "pesan yang memerlukan arahan" : "pesan baru"} dari ${user.fullName}`, entityType: "message", entityId: m.id, priority: notifPriority }, tx);
        return m;
      });
      sendPushToUser(msg.receiverId, { title: notifTitle, body: `${isPerluArahan ? "Pesan perlu arahan" : "Pesan baru"} dari ${user.fullName}`, url: "/pesan" }, isPerluArahan ? { urgency: "high" } : undefined);
      res.json(msg);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal mengirim pesan" });
    }
  });

  app.patch("/api/messages/:id/read", requireAuth, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID tidak valid" });
      const user = req.user as any;
      const message = await storage.getMessage(id);
      if (!message) return res.status(404).json({ message: "Pesan tidak ditemukan" });
      if (message.receiverId !== user.id) return res.status(403).json({ message: "Akses ditolak" });
      await storage.markMessageRead(message.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal menandai pesan" });
    }
  });

  app.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const fullUser = await storage.getUser(user.id);
      if (!fullUser) return res.status(404).json({ message: "User tidak ditemukan" });
      const { password: _, secretAnswer: __, ...safe } = fullUser;
      res.json(safe);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil profil" });
    }
  });

  app.patch("/api/profile", requireAuth, async (req, res) => {
    try {
      const parsed = profilePatchSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));
      const user = req.user as any;
      const { fullName, phone, address, birthDate, branchCount, position } = parsed.data;
      const updated = await storage.updateUser(user.id, {
        fullName, phone, address, birthDate, branchCount, position,
        profileCompleted: true,
      });
      if (!updated) return res.status(404).json({ message: "User tidak ditemukan" });
      const { password: _, secretAnswer: __, ...safe } = updated;
      res.json(safe);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal update profil" });
    }
  });

  app.post("/api/users/:id/reset-password", requireRole("superadmin"), async (req, res) => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));
      const id = parseInt(req.params.id);
      const hashed = await bcrypt.hash(parsed.data.newPassword, 10);
      const user = await storage.updateUser(id, { password: hashed, loginAttempts: 0, lockedUntil: null });
      if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
      res.json({ message: "Password berhasil direset" });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal reset password" });
    }
  });

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));
      const user = req.user as any;
      const { currentPassword, newPassword } = parsed.data;
      const fullUser = await storage.getUser(user.id);
      if (!fullUser) return res.status(404).json({ message: "User tidak ditemukan" });
      const isValid = await bcrypt.compare(currentPassword, fullUser.password);
      if (!isValid) return res.status(400).json({ message: "Password lama salah" });
      const hashed = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(user.id, { password: hashed });
      res.json({ message: "Password berhasil diubah" });
    } catch {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.post("/api/auth/avatar", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { avatarUrl } = req.body;
      if (!avatarUrl || typeof avatarUrl !== "string") {
        return res.status(400).json({ message: "Data foto tidak valid" });
      }
      if (avatarUrl.length > 500000) {
        return res.status(400).json({ message: "Ukuran foto terlalu besar (maks 500KB)" });
      }
      await storage.updateUser(user.id, { avatarUrl });
      res.json({ message: "Foto profil berhasil diperbarui", avatarUrl });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengupload foto" });
    }
  });

  app.delete("/api/auth/avatar", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      await storage.updateUser(user.id, { avatarUrl: null });
      res.json({ message: "Foto profil berhasil dihapus" });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal menghapus foto" });
    }
  });

  app.get("/api/kpi/live", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (["superadmin", "owner"].includes(user.role)) {
        const allUsers = await storage.getUsers();
        const duDkUsers = allUsers.filter(u => ["du", "dk"].includes(u.role) && u.isActive);
        const results = await Promise.all(duDkUsers.map(u => storage.calculateLiveKpi(u.id)));
        res.json(results);
      } else {
        const result = await storage.calculateLiveKpi(user.id);
        res.json([result]);
      }
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal menghitung KPI live" });
    }
  });

  app.get("/api/kpi/live/:userId", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const targetUserId = parseInt(req.params.userId);
      if (!["superadmin", "owner"].includes(user.role) && user.id !== targetUserId) {
        return res.status(403).json({ message: "Akses ditolak" });
      }
      const result = await storage.calculateLiveKpi(targetUserId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal menghitung KPI" });
    }
  });

  app.get("/api/kpi", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (["superadmin", "owner"].includes(user.role)) {
        const data = await storage.getKpiAssessments();
        res.json(data);
      } else {
        const data = await storage.getKpiAssessments(user.id);
        res.json(data);
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil data KPI" });
    }
  });

  app.get("/api/kpi/calculate/:userId", requireRole("superadmin", "owner"), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const period = req.query.period as string;
      if (!period || !/^\d{4}-Q[1-4]$/.test(period)) {
        return res.status(400).json({ message: "Format period tidak valid (contoh: 2026-Q1)" });
      }
      const result = await storage.calculateKpiForUser(userId, period);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal menghitung KPI" });
    }
  });

  app.get("/api/kpi/:id", requireAuth, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID tidak valid" });
      const kpi = await storage.getKpiAssessment(id);
      if (!kpi) return res.status(404).json({ message: "KPI tidak ditemukan" });
      const user = req.user as any;
      if (!["superadmin", "owner"].includes(user.role) && kpi.userId !== user.id) {
        return res.status(403).json({ message: "Akses ditolak" });
      }
      res.json(kpi);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil data KPI" });
    }
  });

  app.get("/api/branches/my-company", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user.companyId) return res.json([]);
      const branchList = await storage.getBranchesByCompany(user.companyId);
      res.json(branchList);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil data cabang" });
    }
  });

  app.get("/api/cases/:id/meetings", requireAuth, async (req, res) => {
    try {
      const caseId = parseId(req.params.id);
      if (!caseId) return res.status(400).json({ message: "ID tidak valid" });
      const user = req.user as any;
      const c = await storage.getCase(caseId);
      if (!c) return res.status(404).json({ message: "Kasus tidak ditemukan" });
      if (!canAccessCompany(user, c.companyId)) return res.status(403).json({ message: "Akses ditolak" });
      const meetings = await storage.getMeetingsByCase(caseId);
      res.json(meetings);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal mengambil data pertemuan" });
    }
  });

  app.post("/api/cases/:id/meetings", requireAuth, async (req, res) => {
    try {
      const caseId = parseId(req.params.id);
      if (!caseId) return res.status(400).json({ message: "ID tidak valid" });
      const user = req.user as any;
      const c = await storage.getCase(caseId);
      if (!c) return res.status(404).json({ message: "Kasus tidak ditemukan" });
      if (!canAccessCompany(user, c.companyId)) return res.status(403).json({ message: "Akses ditolak" });
      const meetingSchema = z.object({
        meetingDate: z.string().min(1, "Tanggal pertemuan wajib diisi"),
        meetingType: z.string().min(1, "Jenis pertemuan wajib diisi"),
        participants: z.string().optional().nullable(),
        location: z.string().optional().nullable(),
        result: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      });
      const parsed = meetingSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));
      const meeting = await storage.createMeeting({
        caseId,
        meetingDate: parsed.data.meetingDate,
        meetingType: parsed.data.meetingType,
        participants: parsed.data.participants || null,
        location: parsed.data.location || null,
        result: parsed.data.result || null,
        notes: parsed.data.notes || null,
        createdBy: user.id,
      });
      notifyAdminsAndOwners(c.companyId, "new_meeting", "Pertemuan Kasus Baru", `${user.fullName} menjadwalkan pertemuan untuk kasus ${c.caseCode}`, "case", caseId, user.id);
      res.json(meeting);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal menambah pertemuan" });
    }
  });

  app.delete("/api/meetings/:id", requireAuth, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID tidak valid" });
      const user = req.user as any;
      const allMeetings = await db.select().from(caseMeetings).where(eq(caseMeetings.id, id));
      if (allMeetings.length === 0) return res.status(404).json({ message: "Pertemuan tidak ditemukan" });
      const meeting = allMeetings[0];
      if (user.role !== "superadmin" && meeting.createdBy !== user.id) {
        return res.status(403).json({ message: "Hanya pembuat atau superadmin yang bisa menghapus pertemuan" });
      }
      await storage.deleteMeeting(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal menghapus pertemuan" });
    }
  });

  app.post("/api/kpi", requireRole("superadmin", "owner"), async (req, res) => {
    try {
      const kpiBodySchema = z.object({
        userId: z.number().int(),
        period: z.string().regex(/^\d{4}-Q[1-4]$/, "Format period: YYYY-Q[1-4]"),
        strengths: z.string().nullable().optional(),
        improvements: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      });
      const parsed = kpiBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));

      const liveData = await storage.calculateLiveKpi(parsed.data.userId);
      const assessor = req.user as any;

      const kpi = await storage.createKpiAssessment({
        userId: parsed.data.userId,
        period: parsed.data.period,
        assessorId: assessor.id,
        activitiesCompleted: liveData.details.activitiesCompleted,
        activitiesTotal: liveData.details.activitiesTotal,
        casesCompleted: liveData.details.casesCompleted,
        casesTotal: liveData.details.casesTotal,
        tasksCompleted: liveData.details.tasksCompleted,
        tasksTotal: liveData.details.tasksTotal,
        avgProgress: liveData.details.avgProgress,
        qualityScore: liveData.scores.penyelesaianAktivitas,
        timelinessScore: liveData.scores.ketepatanWaktu,
        initiativeScore: liveData.scores.responsivitas,
        communicationScore: liveData.scores.penyelesaianKasus,
        regulationScore: liveData.scores.penyelesaianTugas,
        problemSolvingScore: liveData.scores.progressRataRata,
        teamworkScore: liveData.scores.bebanKerja,
        responsibilityScore: liveData.scores.konsistensi,
        totalScore: liveData.totalScore,
        notes: parsed.data.notes || null,
        strengths: parsed.data.strengths || null,
        improvements: parsed.data.improvements || null,
      });
      res.json(kpi);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal menyimpan KPI" });
    }
  });

  return httpServer;
}
