import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireRole } from "./auth";
import { seedData } from "./seed";
import bcrypt from "bcrypt";
import { z } from "zod";
import {
  insertCompanySchema,
  insertMasterCategorySchema,
} from "@shared/schema";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);
  await seedData();

  app.get("/api/companies", requireAuth, async (_req, res) => {
    const data = await storage.getCompanies();
    res.json(data);
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

  app.get("/api/users", requireAuth, async (req, res) => {
    const user = req.user as any;
    const data = await storage.getUsers();
    const safe = data.map(({ password, secretAnswer, ...u }) => u);
    if (["superadmin", "owner"].includes(user.role)) {
      return res.json(safe);
    }
    return res.json(safe.filter((u: any) => u.companyId === user.companyId || ["superadmin", "owner"].includes(u.role)));
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
    const user = req.user as any;
    const companyId = ["superadmin", "owner"].includes(user.role) ? undefined : user.companyId;
    const stats = await storage.getDashboardStats(companyId);
    res.json(stats);
  });

  app.get("/api/categories", requireAuth, async (req, res) => {
    const type = req.query.type as string | undefined;
    const data = await storage.getCategories(type);
    res.json(data);
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
    const user = req.user as any;
    const companyId = ["superadmin", "owner"].includes(user.role) ? undefined : user.companyId;
    const data = await storage.getActivities(companyId);
    const pagination = parsePagination(req.query);
    res.json(paginateArray(data, pagination));
  });

  app.get("/api/activities/:id", requireAuth, async (req, res) => {
    const user = req.user as any;
    const activity = await storage.getActivity(parseInt(req.params.id));
    if (!activity) return res.status(404).json({ message: "Aktivitas tidak ditemukan" });
    if (!canAccessCompany(user, activity.companyId)) return res.status(403).json({ message: "Akses ditolak" });
    res.json(activity);
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
    const user = req.user as any;
    const companyId = ["superadmin", "owner"].includes(user.role) ? undefined : user.companyId;
    const data = await storage.getCases(companyId);
    const pagination = parsePagination(req.query);
    res.json(paginateArray(data, pagination));
  });

  app.get("/api/cases/:id", requireAuth, async (req, res) => {
    const user = req.user as any;
    const c = await storage.getCase(parseInt(req.params.id));
    if (!c) return res.status(404).json({ message: "Kasus tidak ditemukan" });
    if (!canAccessCompany(user, c.companyId)) return res.status(403).json({ message: "Akses ditolak" });
    res.json(c);
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
    const user = req.user as any;
    const c = await storage.getCase(parseInt(req.params.id));
    if (!c) return res.status(404).json({ message: "Kasus tidak ditemukan" });
    if (!canAccessCompany(user, c.companyId)) return res.status(403).json({ message: "Akses ditolak" });
    const data = await storage.getCaseUpdates(c.id);
    res.json(data);
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
    const user = req.user as any;
    let filters: any = {};
    if (["du", "dk"].includes(user.role)) {
      filters.assignedTo = user.id;
    }
    const data = await storage.getTasks(filters);
    const pagination = parsePagination(req.query);
    res.json(paginateArray(data, pagination));
  });

  app.get("/api/tasks/:id", requireAuth, async (req, res) => {
    const user = req.user as any;
    const task = await storage.getTask(parseInt(req.params.id));
    if (!task) return res.status(404).json({ message: "Tugas tidak ditemukan" });
    if (["du", "dk"].includes(user.role) && task.assignedTo !== user.id) {
      return res.status(403).json({ message: "Akses ditolak" });
    }
    res.json(task);
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
        return res.json(task);
      }
      const taskPatchParsed = taskPatchSchema.safeParse(req.body);
      if (!taskPatchParsed.success) return res.status(400).json(formatZodError(taskPatchParsed.error));
      const task = await storage.updateTask(existing.id, taskPatchParsed.data);
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
    const data = await storage.getAnnouncements();
    const pagination = parsePagination(req.query);
    res.json(paginateArray(data, pagination));
  });

  app.post("/api/announcements", requireRole("superadmin", "owner"), async (req, res) => {
    try {
      const parsed = announcementBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));
      const user = req.user as any;
      const ann = await storage.createAnnouncement({ ...parsed.data, createdBy: user.id });
      res.json(ann);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal membuat pengumuman" });
    }
  });

  app.get("/api/announcements/:id/reads", requireAuth, async (req, res) => {
    const reads = await storage.getAnnouncementReads(parseInt(req.params.id));
    res.json(reads);
  });

  app.post("/api/announcements/:id/read", requireAuth, async (req, res) => {
    const user = req.user as any;
    const read = await storage.markAnnouncementRead({ announcementId: parseInt(req.params.id), userId: user.id });
    res.json(read);
  });

  app.get("/api/comments/:entityType/:entityId", requireAuth, async (req, res) => {
    const data = await storage.getComments(req.params.entityType, parseInt(req.params.entityId));
    res.json(data);
  });

  app.post("/api/comments", requireAuth, async (req, res) => {
    try {
      const parsed = commentBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));
      const user = req.user as any;
      const comment = await storage.createComment({ ...parsed.data, createdBy: user.id });
      res.json(comment);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal menambah komentar" });
    }
  });

  app.get("/api/notifications", requireAuth, async (req, res) => {
    const user = req.user as any;
    const data = await storage.getNotifications(user.id);
    const pagination = parsePagination(req.query);
    res.json(paginateArray(data, pagination));
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    const user = req.user as any;
    const count = await storage.getUnreadNotificationCount(user.id);
    res.json({ count });
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    const user = req.user as any;
    const notification = await storage.getNotification(parseInt(req.params.id));
    if (!notification) return res.status(404).json({ message: "Notifikasi tidak ditemukan" });
    if (notification.userId !== user.id) return res.status(403).json({ message: "Akses ditolak" });
    await storage.markNotificationRead(notification.id);
    res.json({ success: true });
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    const user = req.user as any;
    await storage.markAllNotificationsRead(user.id);
    res.json({ success: true });
  });

  app.get("/api/messages", requireAuth, async (req, res) => {
    const user = req.user as any;
    const data = await storage.getMessages(user.id);
    const pagination = parsePagination(req.query);
    res.json(paginateArray(data, pagination));
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const parsed = messageBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));
      const user = req.user as any;
      const msg = await storage.transaction(async (tx) => {
        const m = await storage.createMessage({ ...parsed.data, senderId: user.id }, tx);
        await storage.createNotification({ userId: m.receiverId, type: "new_message", title: "Pesan Baru", message: `Anda mendapat pesan baru dari ${user.fullName}`, entityType: "message", entityId: m.id, priority: "medium" }, tx);
        return m;
      });
      res.json(msg);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal mengirim pesan" });
    }
  });

  app.patch("/api/messages/:id/read", requireAuth, async (req, res) => {
    const user = req.user as any;
    const message = await storage.getMessage(parseInt(req.params.id));
    if (!message) return res.status(404).json({ message: "Pesan tidak ditemukan" });
    if (message.receiverId !== user.id) return res.status(403).json({ message: "Akses ditolak" });
    await storage.markMessageRead(message.id);
    res.json({ success: true });
  });

  app.get("/api/profile", requireAuth, async (req, res) => {
    const user = req.user as any;
    const fullUser = await storage.getUser(user.id);
    if (!fullUser) return res.status(404).json({ message: "User tidak ditemukan" });
    const { password: _, secretAnswer: __, ...safe } = fullUser;
    res.json(safe);
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

  return httpServer;
}
