import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireRole } from "./auth";
import { seedData } from "./seed";
import bcrypt from "bcrypt";

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
      const { password, ...rest } = req.body;
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
    const cat = await storage.createCategory(req.body);
    res.json(cat);
  });

  app.get("/api/activities", requireAuth, async (req, res) => {
    const user = req.user as any;
    const companyId = ["superadmin", "owner"].includes(user.role) ? undefined : user.companyId;
    const data = await storage.getActivities(companyId);
    res.json(data);
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
      const user = req.user as any;
      const activity = await storage.createActivity({
        ...req.body,
        createdBy: user.id,
        companyId: req.body.companyId || user.companyId,
      });
      await storage.createAuditLog({ userId: user.id, action: "create", entityType: "activity", entityId: activity.id, details: `Membuat aktivitas: ${activity.title}` });
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
      const activity = await storage.updateActivity(existing.id, req.body);
      await storage.createAuditLog({ userId: user.id, action: "update", entityType: "activity", entityId: existing.id, details: `Mengupdate aktivitas: ${existing.title}` });
      res.json(activity);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal update aktivitas" });
    }
  });

  app.get("/api/cases", requireAuth, async (req, res) => {
    const user = req.user as any;
    const companyId = ["superadmin", "owner"].includes(user.role) ? undefined : user.companyId;
    const data = await storage.getCases(companyId);
    res.json(data);
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
      const user = req.user as any;
      const c = await storage.createCase({ ...req.body, createdBy: user.id, companyId: req.body.companyId || user.companyId });
      await storage.createAuditLog({ userId: user.id, action: "create", entityType: "case", entityId: c.id, details: `Membuat kasus: ${c.caseCode}` });
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
      const c = await storage.updateCase(existing.id, req.body);
      await storage.createAuditLog({ userId: user.id, action: "update", entityType: "case", entityId: existing.id, details: `Mengupdate kasus: ${existing.caseCode}` });
      res.json(c);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal update kasus" });
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
      const update = await storage.createCaseUpdate({ ...req.body, caseId, createdBy: user.id });
      if (req.body.newStage || req.body.newProgress !== undefined) {
        const updateData: any = {};
        if (req.body.newStage) updateData.workflowStage = req.body.newStage;
        if (req.body.newProgress !== undefined) updateData.progress = req.body.newProgress;
        await storage.updateCase(caseId, updateData);
      }
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
    res.json(data);
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
      const user = req.user as any;
      const task = await storage.createTask({ ...req.body, createdBy: user.id });
      await storage.createNotification({ userId: task.assignedTo, type: "task_assigned", title: "Tugas Baru", message: `Anda mendapat tugas baru: ${task.title}`, entityType: "task", entityId: task.id, priority: task.priority === "High" ? "high" : "medium" });
      await storage.createAuditLog({ userId: user.id, action: "create", entityType: "task", entityId: task.id, details: `Membuat tugas: ${task.title}` });
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
        const allowed = { status: req.body.status, progress: req.body.progress, notes: req.body.notes };
        const task = await storage.updateTask(existing.id, allowed);
        return res.json(task);
      }
      const task = await storage.updateTask(existing.id, req.body);
      res.json(task);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal update tugas" });
    }
  });

  app.get("/api/announcements", requireAuth, async (_req, res) => {
    const data = await storage.getAnnouncements();
    res.json(data);
  });

  app.post("/api/announcements", requireRole("superadmin", "owner"), async (req, res) => {
    try {
      const user = req.user as any;
      const ann = await storage.createAnnouncement({ ...req.body, createdBy: user.id });
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
      const user = req.user as any;
      const comment = await storage.createComment({ ...req.body, createdBy: user.id });
      res.json(comment);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal menambah komentar" });
    }
  });

  app.get("/api/notifications", requireAuth, async (req, res) => {
    const user = req.user as any;
    const data = await storage.getNotifications(user.id);
    res.json(data);
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    const user = req.user as any;
    const count = await storage.getUnreadNotificationCount(user.id);
    res.json({ count });
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    await storage.markNotificationRead(parseInt(req.params.id));
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
    res.json(data);
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const msg = await storage.createMessage({ ...req.body, senderId: user.id });
      await storage.createNotification({ userId: msg.receiverId, type: "new_message", title: "Pesan Baru", message: `Anda mendapat pesan baru dari ${user.fullName}`, entityType: "message", entityId: msg.id, priority: "medium" });
      res.json(msg);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal mengirim pesan" });
    }
  });

  app.patch("/api/messages/:id/read", requireAuth, async (req, res) => {
    await storage.markMessageRead(parseInt(req.params.id));
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
      const user = req.user as any;
      const { fullName, phone, address, birthDate, branchCount, position } = req.body;
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

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { currentPassword, newPassword } = req.body;
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
