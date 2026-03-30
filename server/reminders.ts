import { db } from "./db";
import { storage } from "./storage";
import { tasks, cases, messages, notifications, activities, users } from "@shared/schema";
import { eq, and, ne, sql, count, lt } from "drizzle-orm";
import webpush from "web-push";

async function sendPushToUser(userId: number, payload: { title: string; body: string; url?: string }) {
  try {
    const subs = await storage.getPushSubscriptions(userId);
    await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        ).catch(async (err: any) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await storage.deletePushSubscription(sub.endpoint);
          }
        })
      )
    );
  } catch {}
}

async function hasSimilarNotification(userId: number, type: string, entityId: number | null, windowHours: number = 24): Promise<boolean> {
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const conditions = [
    eq(notifications.userId, userId),
    eq(notifications.type, type),
    sql`${notifications.createdAt} > ${cutoff.toISOString()}::timestamp`,
  ];
  if (entityId) {
    conditions.push(eq(notifications.entityId, entityId));
  }
  const [result] = await db.select({ count: count() }).from(notifications).where(and(...conditions));
  return (result?.count || 0) > 0;
}

export async function hasRecentNotification(userId: number, type: string, entityId: number | null, windowMinutes: number = 60): Promise<boolean> {
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
  const conditions = [
    eq(notifications.userId, userId),
    eq(notifications.type, type),
    sql`${notifications.createdAt} > ${cutoff.toISOString()}::timestamp`,
  ];
  if (entityId) {
    conditions.push(eq(notifications.entityId, entityId));
  }
  const [result] = await db.select({ count: count() }).from(notifications).where(and(...conditions));
  return (result?.count || 0) > 0;
}

async function getAdminsAndOwners(companyId: number | null): Promise<number[]> {
  const allUsers = await storage.getUsers();
  return allUsers
    .filter(u => u.isActive && (u.role === "superadmin" || u.role === "owner"))
    .map(u => u.id);
}

const STALE_THROTTLE_HOURS = 72;
const STALE_TYPES = ["case_stale", "task_stale"];

async function createReminderNotification(userId: number, type: string, title: string, message: string, entityType: string, entityId: number, priority: string) {
  const windowHours = STALE_TYPES.includes(type) ? STALE_THROTTLE_HOURS : 24;
  const exists = await hasSimilarNotification(userId, type, entityId, windowHours);
  if (exists) return;
  await storage.createNotification({ userId, type, title, message, entityType, entityId, priority });
  const detailRoutes: Record<string, string> = { case: "/kasus", activity: "/aktivitas" };
  const listRoutes: Record<string, string> = { task: "/tugas", announcement: "/pengumuman", message: "/pesan" };
  const pushUrl = (detailRoutes[entityType] && entityId) ? `${detailRoutes[entityType]}/${entityId}` : listRoutes[entityType] || "/";
  sendPushToUser(userId, { title, body: message, url: pushUrl });
}

async function checkOverdueTasks() {
  const now = new Date().toISOString().split("T")[0];
  const allTasks = await db.select().from(tasks)
    .where(and(
      eq(tasks.isArchived, false),
      ne(tasks.status, "Selesai"),
    ));
  const overdueTasks = allTasks.filter(t => t.deadline && t.deadline < now);

  for (const task of overdueTasks) {
    await createReminderNotification(task.assignedTo, "task_overdue", "Tugas Melewati Deadline", `Tugas "${task.title}" sudah melewati deadline (${task.deadline})`, "task", task.id, "high");
    const admins = await getAdminsAndOwners(task.companyId);
    const assignee = await storage.getUser(task.assignedTo);
    for (const adminId of admins) {
      await createReminderNotification(adminId, "task_overdue", "Tugas Melewati Deadline", `Tugas "${task.title}" (${assignee?.fullName || "?"}) sudah melewati deadline`, "task", task.id, "high");
    }
  }
}

async function checkStaleCases() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const allCases = await db.select().from(cases)
    .where(and(
      eq(cases.isArchived, false),
      ne(cases.workflowStage, "Closed"),
    ));
  const staleCases = allCases.filter(c => {
    const updated = c.updatedAt ? new Date(c.updatedAt) : new Date(c.createdAt);
    return updated < sevenDaysAgo;
  });

  for (const c of staleCases) {
    if (c.createdBy) {
      await createReminderNotification(c.createdBy, "case_stale", "Kasus Belum Di-Follow Up", `Kasus ${c.caseCode} belum diperbarui lebih dari 7 hari`, "case", c.id, "medium");
    }
    const admins = await getAdminsAndOwners(c.companyId);
    for (const adminId of admins) {
      await createReminderNotification(adminId, "case_stale", "Kasus Belum Di-Follow Up", `Kasus ${c.caseCode} belum diperbarui lebih dari 7 hari`, "case", c.id, "medium");
    }
  }
}

async function checkStaleTasks() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const allTasks = await db.select().from(tasks)
    .where(and(
      eq(tasks.isArchived, false),
      ne(tasks.status, "Selesai"),
      lt(tasks.progress, 50),
    ));

  const staleTasks = allTasks.filter(t => {
    const created = new Date(t.createdAt).toISOString();
    return created < sevenDaysAgo;
  });

  for (const task of staleTasks) {
    await createReminderNotification(task.assignedTo, "task_stale", "Tugas Belum Dikerjakan", `Tugas "${task.title}" sudah lebih dari 7 hari dengan progress ${task.progress}%`, "task", task.id, "medium");
    const admins = await getAdminsAndOwners(task.companyId);
    for (const adminId of admins) {
      await createReminderNotification(adminId, "task_stale", "Tugas Belum Dikerjakan", `Tugas "${task.title}" sudah lebih dari 7 hari dengan progress ${task.progress}%`, "task", task.id, "medium");
    }
  }
}

async function checkUnreadMessages() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const allUnread = await db.select().from(messages)
    .where(eq(messages.isRead, false));
  const unreadMessages = allUnread.filter(m => new Date(m.createdAt) < oneDayAgo);

  for (const msg of unreadMessages) {
    const sender = await storage.getUser(msg.senderId);
    await createReminderNotification(msg.receiverId, "message_unread", "Pesan Belum Dibaca", `Anda memiliki pesan belum dibaca dari ${sender?.fullName || "?"}`, "message", msg.id, "medium");
  }
}

async function sendDailySummary() {
  const now = new Date();
  const wibHour = (now.getUTCHours() + 7) % 24;
  if (wibHour !== 8) return;

  const today = now.toISOString().split("T")[0];
  const allTasks = await db.select().from(tasks).where(and(eq(tasks.isArchived, false), ne(tasks.status, "Selesai")));
  const overdueTasks = allTasks.filter(t => t.deadline && t.deadline < today);
  const todayDeadline = allTasks.filter(t => t.deadline === today);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const allCases = await db.select().from(cases).where(and(eq(cases.isArchived, false), ne(cases.workflowStage, "Closed")));
  const staleCases = allCases.filter(c => {
    const updated = c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date(c.createdAt).toISOString();
    return updated < sevenDaysAgo;
  });

  const summaryParts = [];
  if (todayDeadline.length > 0) summaryParts.push(`${todayDeadline.length} tugas deadline hari ini`);
  if (overdueTasks.length > 0) summaryParts.push(`${overdueTasks.length} tugas overdue`);
  if (staleCases.length > 0) summaryParts.push(`${staleCases.length} kasus belum di-follow up`);

  if (summaryParts.length === 0) return;

  const message = `Ringkasan: ${summaryParts.join(", ")}. Total ${allTasks.length} tugas aktif, ${allCases.length} kasus aktif.`;

  const admins = await getAdminsAndOwners(null);
  const allUsers = await storage.getUsers();
  const owners = allUsers.filter(u => u.isActive && u.role === "owner").map(u => u.id);
  const targetIds = new Set([...admins, ...owners]);

  for (const userId of targetIds) {
    const exists = await hasSimilarNotification(userId, "daily_summary", null);
    if (exists) continue;
    await storage.createNotification({ userId, type: "daily_summary", title: "Ringkasan Harian", message, entityType: null, entityId: null, priority: "low" });
    sendPushToUser(userId, { title: "Ringkasan Harian", body: message, url: "/" });
  }
}

async function checkNoActivityToday() {
  const now = new Date();
  const wibHour = (now.getUTCHours() + 7) % 24;
  if (wibHour < 14) return;

  const today = now.toISOString().split("T")[0];
  const allUsers = await storage.getUsers();
  const duDkUsers = allUsers.filter(u => ["du", "dk"].includes(u.role) && u.isActive);

  const allActivities = await db.select().from(activities)
    .where(and(eq(activities.isArchived, false), sql`${activities.date} = ${today}`));

  const usersWithActivity = new Set(allActivities.map(a => a.createdBy));

  for (const u of duDkUsers) {
    if (usersWithActivity.has(u.id)) continue;
    const exists = await hasSimilarNotification(u.id, "no_activity", null, STALE_THROTTLE_HOURS);
    if (exists) continue;
    await storage.createNotification({
      userId: u.id,
      type: "no_activity",
      title: "Belum Ada Aktivitas Hari Ini",
      message: `Anda belum mencatat aktivitas untuk tanggal ${today}. Segera catat aktivitas operasional Anda.`,
      entityType: "activity",
      entityId: null,
      priority: "medium",
    });
    sendPushToUser(u.id, { title: "Belum Ada Aktivitas", body: "Anda belum mencatat aktivitas hari ini", url: "/aktivitas" });
  }

  const admins = await getAdminsAndOwners(null);
  const noActivityUsers = duDkUsers.filter(u => !usersWithActivity.has(u.id));
  if (noActivityUsers.length > 0) {
    const names = noActivityUsers.map(u => u.fullName).slice(0, 5).join(", ");
    const suffix = noActivityUsers.length > 5 ? ` dan ${noActivityUsers.length - 5} lainnya` : "";
    for (const adminId of admins) {
      const exists = await hasSimilarNotification(adminId, "no_activity_report", null, STALE_THROTTLE_HOURS);
      if (exists) continue;
      await storage.createNotification({
        userId: adminId,
        type: "no_activity_report",
        title: "Laporan Aktivitas Kosong",
        message: `${noActivityUsers.length} personil belum mencatat aktivitas hari ini: ${names}${suffix}`,
        entityType: "activity",
        entityId: null,
        priority: "medium",
      });
      sendPushToUser(adminId, { title: "Aktivitas Kosong", body: `${noActivityUsers.length} personil belum mencatat aktivitas hari ini`, url: "/aktivitas" });
    }
  }
}

async function cleanupOldNotifications() {
  const deleted = await storage.deleteOldNotifications(7);
  if (deleted > 0) {
    console.log(`Auto-cleanup: ${deleted} notifikasi lama (>7 hari) dihapus`);
  }
}

async function runAllReminders() {
  try {
    await cleanupOldNotifications();
    await checkOverdueTasks();
    await checkStaleCases();
    await checkStaleTasks();
    await checkUnreadMessages();
    await checkNoActivityToday();
    await sendDailySummary();
  } catch (err) {
    console.error("Error running reminders:", err);
  }
}

export function startReminders() {
  setTimeout(() => runAllReminders(), 30000);
  setInterval(() => runAllReminders(), 60 * 60 * 1000);
  console.log("Sistem pengingat otomatis aktif (interval: 1 jam)");
}
