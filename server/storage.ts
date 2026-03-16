import { db } from "./db";
import { eq, and, desc, or, sql, count, isNull, gte, lte } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  companies, users, masterCategories, activities, cases, caseUpdates, caseMeetings,
  tasks, announcements, announcementReads, comments, notifications, messages, auditLogs, kpiAssessments, branches,
  pushSubscriptions,
  type InsertCompany, type Company, type InsertUser, type User,
  type InsertMasterCategory, type MasterCategory,
  type InsertActivity, type Activity, type InsertCase, type Case,
  type InsertCaseUpdate, type CaseUpdate, type InsertTask, type Task,
  type InsertAnnouncement, type Announcement, type InsertAnnouncementRead, type AnnouncementRead,
  type InsertComment, type Comment, type InsertNotification, type Notification,
  type InsertMessage, type Message, type InsertAuditLog, type AuditLog,
  type InsertKpiAssessment, type KpiAssessment,
  type InsertBranch, type Branch,
  type InsertCaseMeeting, type CaseMeeting,
  type PushSubscription,
} from "@shared/schema";
import * as schema from "@shared/schema";

type TxOrDb = NodePgDatabase<typeof schema>;

export interface IStorage {
  getCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(data: InsertCompany): Promise<Company>;
  updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company | undefined>;

  getBranchesByCompany(companyId: number): Promise<Branch[]>;
  getBranch(id: number): Promise<Branch | undefined>;
  createBranch(data: InsertBranch): Promise<Branch>;
  updateBranch(id: number, data: Partial<InsertBranch>): Promise<Branch | undefined>;
  deleteBranch(id: number): Promise<void>;

  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUsersByCompany(companyId: number): Promise<User[]>;
  createUser(data: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;

  getCategories(type?: string): Promise<MasterCategory[]>;
  createCategory(data: InsertMasterCategory): Promise<MasterCategory>;

  getActivities(companyId?: number): Promise<Activity[]>;
  getActivity(id: number): Promise<Activity | undefined>;
  createActivity(data: InsertActivity, tx?: TxOrDb): Promise<Activity>;
  updateActivity(id: number, data: Partial<Activity>, tx?: TxOrDb): Promise<Activity | undefined>;

  getCases(companyId?: number): Promise<Case[]>;
  getCase(id: number): Promise<Case | undefined>;
  createCase(data: InsertCase, tx?: TxOrDb): Promise<Case>;
  updateCase(id: number, data: Partial<Case>, tx?: TxOrDb): Promise<Case | undefined>;

  getCaseUpdates(caseId: number): Promise<CaseUpdate[]>;
  createCaseUpdate(data: InsertCaseUpdate, tx?: TxOrDb): Promise<CaseUpdate>;

  getTasks(filters?: { assignedTo?: number; createdBy?: number; companyId?: number }): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(data: InsertTask, tx?: TxOrDb): Promise<Task>;
  updateTask(id: number, data: Partial<Task>, tx?: TxOrDb): Promise<Task | undefined>;

  getAnnouncements(): Promise<Announcement[]>;
  getAnnouncement(id: number): Promise<Announcement | undefined>;
  createAnnouncement(data: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: number, data: Partial<Announcement>): Promise<Announcement | undefined>;
  getAnnouncementReads(announcementId: number): Promise<AnnouncementRead[]>;
  markAnnouncementRead(data: InsertAnnouncementRead): Promise<AnnouncementRead>;

  getComments(entityType: string, entityId: number): Promise<Comment[]>;
  createComment(data: InsertComment): Promise<Comment>;

  getNotification(id: number): Promise<Notification | undefined>;
  getNotifications(userId: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  createNotification(data: InsertNotification, tx?: TxOrDb): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;
  markAllNotificationsRead(userId: number): Promise<void>;
  deleteNotification(id: number, userId: number): Promise<void>;
  deleteReadNotifications(userId: number): Promise<number>;
  deleteAllNotifications(userId: number): Promise<number>;
  deleteOldReadNotifications(days: number): Promise<number>;

  getMessage(id: number): Promise<Message | undefined>;
  getMessages(userId: number): Promise<Message[]>;
  createMessage(data: InsertMessage, tx?: TxOrDb): Promise<Message>;
  markMessageRead(id: number): Promise<void>;

  createAuditLog(data: InsertAuditLog, tx?: TxOrDb): Promise<AuditLog>;

  getDashboardStats(companyId?: number): Promise<any>;

  getKpiAssessments(userId?: number): Promise<KpiAssessment[]>;
  getKpiAssessment(id: number): Promise<KpiAssessment | undefined>;
  createKpiAssessment(data: InsertKpiAssessment): Promise<KpiAssessment>;
  calculateKpiForUser(userId: number, period: string): Promise<any>;
  calculateLiveKpi(userId: number): Promise<any>;

  getMeetingsByCase(caseId: number): Promise<CaseMeeting[]>;
  createMeeting(data: InsertCaseMeeting): Promise<CaseMeeting>;
  deleteMeeting(id: number): Promise<void>;

  getPushSubscriptions(userId: number): Promise<PushSubscription[]>;
  savePushSubscription(userId: number, endpoint: string, p256dh: string, auth: string): Promise<PushSubscription>;
  deletePushSubscription(endpoint: string): Promise<void>;
  deletePushSubscriptionByUser(userId: number, endpoint: string): Promise<void>;

  transaction<T>(fn: (tx: TxOrDb) => Promise<T>): Promise<T>;
}

export class DatabaseStorage implements IStorage {
  async getCompanies(): Promise<Company[]> {
    return db.select().from(companies).where(eq(companies.isActive, true));
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(data: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(data).returning();
    return company;
  }

  async updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company | undefined> {
    const [company] = await db.update(companies).set(data).where(eq(companies.id, id)).returning();
    return company;
  }

  async getBranchesByCompany(companyId: number): Promise<Branch[]> {
    return db.select().from(branches).where(and(eq(branches.companyId, companyId), eq(branches.isActive, true)));
  }

  async getBranch(id: number): Promise<Branch | undefined> {
    const [branch] = await db.select().from(branches).where(eq(branches.id, id));
    return branch;
  }

  async createBranch(data: InsertBranch): Promise<Branch> {
    const [branch] = await db.insert(branches).values(data).returning();
    return branch;
  }

  async updateBranch(id: number, data: Partial<InsertBranch>): Promise<Branch | undefined> {
    const [branch] = await db.update(branches).set(data).where(eq(branches.id, id)).returning();
    return branch;
  }

  async deleteBranch(id: number): Promise<void> {
    await db.update(branches).set({ isActive: false }).where(eq(branches.id, id));
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.fullName);
  }

  async getUsersByCompany(companyId: number): Promise<User[]> {
    return db.select().from(users).where(eq(users.companyId, companyId));
  }

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async getCategories(type?: string): Promise<MasterCategory[]> {
    if (type) {
      return db.select().from(masterCategories).where(and(eq(masterCategories.type, type), eq(masterCategories.isActive, true)));
    }
    return db.select().from(masterCategories).where(eq(masterCategories.isActive, true));
  }

  async createCategory(data: InsertMasterCategory): Promise<MasterCategory> {
    const [cat] = await db.insert(masterCategories).values(data).returning();
    return cat;
  }

  async getActivities(companyId?: number): Promise<Activity[]> {
    if (companyId) {
      return db.select().from(activities).where(and(eq(activities.companyId, companyId), eq(activities.isArchived, false))).orderBy(desc(activities.createdAt));
    }
    return db.select().from(activities).where(eq(activities.isArchived, false)).orderBy(desc(activities.createdAt));
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(and(eq(activities.id, id), eq(activities.isArchived, false)));
    return activity;
  }

  async createActivity(data: InsertActivity, tx?: TxOrDb): Promise<Activity> {
    const d = tx || db;
    const [activity] = await d.insert(activities).values(data).returning();
    return activity;
  }

  async updateActivity(id: number, data: Partial<Activity>, tx?: TxOrDb): Promise<Activity | undefined> {
    const d = tx || db;
    const [activity] = await d.update(activities).set({ ...data, updatedAt: new Date() }).where(eq(activities.id, id)).returning();
    return activity;
  }

  async getCases(companyId?: number): Promise<Case[]> {
    if (companyId) {
      return db.select().from(cases).where(and(eq(cases.companyId, companyId), eq(cases.isArchived, false))).orderBy(desc(cases.createdAt));
    }
    return db.select().from(cases).where(eq(cases.isArchived, false)).orderBy(desc(cases.createdAt));
  }

  async getCase(id: number): Promise<Case | undefined> {
    const [c] = await db.select().from(cases).where(and(eq(cases.id, id), eq(cases.isArchived, false)));
    return c;
  }

  async createCase(data: InsertCase, tx?: TxOrDb): Promise<Case> {
    const d = tx || db;
    const [c] = await d.insert(cases).values(data).returning();
    return c;
  }

  async updateCase(id: number, data: Partial<Case>, tx?: TxOrDb): Promise<Case | undefined> {
    const d = tx || db;
    const [c] = await d.update(cases).set({ ...data, updatedAt: new Date() }).where(eq(cases.id, id)).returning();
    return c;
  }

  async getCaseUpdates(caseId: number): Promise<CaseUpdate[]> {
    return db.select().from(caseUpdates).where(eq(caseUpdates.caseId, caseId)).orderBy(desc(caseUpdates.createdAt));
  }

  async createCaseUpdate(data: InsertCaseUpdate, tx?: TxOrDb): Promise<CaseUpdate> {
    const d = tx || db;
    const [update] = await d.insert(caseUpdates).values(data).returning();
    return update;
  }

  async getTasks(filters?: { assignedTo?: number; createdBy?: number; companyId?: number }): Promise<Task[]> {
    const conditions = [eq(tasks.isArchived, false)];
    if (filters?.assignedTo) conditions.push(eq(tasks.assignedTo, filters.assignedTo));
    if (filters?.createdBy) conditions.push(eq(tasks.createdBy, filters.createdBy));
    if (filters?.companyId) conditions.push(eq(tasks.companyId, filters.companyId));
    return db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.isArchived, false)));
    return task;
  }

  async createTask(data: InsertTask, tx?: TxOrDb): Promise<Task> {
    const d = tx || db;
    const [task] = await d.insert(tasks).values(data).returning();
    return task;
  }

  async updateTask(id: number, data: Partial<Task>, tx?: TxOrDb): Promise<Task | undefined> {
    const d = tx || db;
    const [task] = await d.update(tasks).set({ ...data, updatedAt: new Date() }).where(eq(tasks.id, id)).returning();
    return task;
  }

  async getAnnouncements(): Promise<Announcement[]> {
    return db.select().from(announcements).where(eq(announcements.isArchived, false)).orderBy(desc(announcements.createdAt));
  }

  async getAnnouncement(id: number): Promise<Announcement | undefined> {
    const [ann] = await db.select().from(announcements).where(and(eq(announcements.id, id), eq(announcements.isArchived, false)));
    return ann;
  }

  async createAnnouncement(data: InsertAnnouncement): Promise<Announcement> {
    const [ann] = await db.insert(announcements).values(data).returning();
    return ann;
  }

  async updateAnnouncement(id: number, data: Partial<Announcement>): Promise<Announcement | undefined> {
    const [ann] = await db.update(announcements).set(data).where(eq(announcements.id, id)).returning();
    return ann;
  }

  async getAnnouncementReads(announcementId: number): Promise<AnnouncementRead[]> {
    return db.select().from(announcementReads).where(eq(announcementReads.announcementId, announcementId));
  }

  async markAnnouncementRead(data: InsertAnnouncementRead): Promise<AnnouncementRead> {
    const existing = await db.select().from(announcementReads).where(
      and(eq(announcementReads.announcementId, data.announcementId), eq(announcementReads.userId, data.userId))
    );
    if (existing.length > 0) return existing[0];
    const [read] = await db.insert(announcementReads).values(data).returning();
    return read;
  }

  async getComments(entityType: string, entityId: number): Promise<Comment[]> {
    return db.select().from(comments).where(
      and(eq(comments.entityType, entityType), eq(comments.entityId, entityId))
    ).orderBy(comments.createdAt);
  }

  async createComment(data: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(data).returning();
    return comment;
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    const [notif] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notif;
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(notifications).where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
    return result?.count || 0;
  }

  async createNotification(data: InsertNotification, tx?: TxOrDb): Promise<Notification> {
    const d = tx || db;
    const [notif] = await d.insert(notifications).values(data).returning();
    return notif;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: number, userId: number): Promise<void> {
    await db.delete(notifications).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async deleteReadNotifications(userId: number): Promise<number> {
    const result = await db.delete(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, true))).returning({ id: notifications.id });
    return result.length;
  }

  async deleteAllNotifications(userId: number): Promise<number> {
    const result = await db.delete(notifications).where(eq(notifications.userId, userId)).returning({ id: notifications.id });
    return result.length;
  }

  async deleteOldReadNotifications(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await db.delete(notifications).where(and(eq(notifications.isRead, true), sql`${notifications.createdAt} < ${cutoff.toISOString()}::timestamp`)).returning({ id: notifications.id });
    return result.length;
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [msg] = await db.select().from(messages).where(eq(messages.id, id));
    return msg;
  }

  async getMessages(userId: number): Promise<Message[]> {
    return db.select().from(messages).where(
      or(eq(messages.senderId, userId), eq(messages.receiverId, userId))
    ).orderBy(desc(messages.createdAt));
  }

  async createMessage(data: InsertMessage, tx?: TxOrDb): Promise<Message> {
    const d = tx || db;
    const [msg] = await d.insert(messages).values(data).returning();
    return msg;
  }

  async markMessageRead(id: number): Promise<void> {
    await db.update(messages).set({ isRead: true }).where(eq(messages.id, id));
  }

  async createAuditLog(data: InsertAuditLog, tx?: TxOrDb): Promise<AuditLog> {
    const d = tx || db;
    const [log] = await d.insert(auditLogs).values(data).returning();
    return log;
  }

  async getDashboardStats(companyId?: number): Promise<any> {
    const today = new Date().toISOString().split("T")[0];
    const actConditions = companyId
      ? and(eq(activities.isArchived, false), eq(activities.companyId, companyId))
      : eq(activities.isArchived, false);
    const caseConditions = companyId
      ? and(eq(cases.isArchived, false), eq(cases.companyId, companyId))
      : eq(cases.isArchived, false);
    const taskConditions = eq(tasks.isArchived, false);

    const waitingCondition = and(
      caseConditions,
      sql`${cases.status} != 'Closed'`,
      sql`${cases.workflowStage} IN ('Proses Regulator', 'Settlement / Deadlock')`
    );
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      [totalActivities],
      [totalCases],
      [activeCases],
      [overdueCases],
      [completedActivities],
      [closedCases],
      [waitingCases],
      [longWaitingCases],
      [totalTasks],
      [pendingTasks],
      [completedTasks],
      [totalAnnouncements],
      recentActivities,
      recentCases,
      highRiskCases,
    ] = await Promise.all([
      db.select({ count: count() }).from(activities).where(actConditions),
      db.select({ count: count() }).from(cases).where(caseConditions),
      db.select({ count: count() }).from(cases).where(and(caseConditions, sql`${cases.status} != 'Closed'`, sql`${cases.workflowStage} NOT IN ('Proses Regulator', 'Settlement / Deadlock')`)),
      db.select({ count: count() }).from(cases).where(and(caseConditions, sql`${cases.targetDate} < ${today}`, sql`${cases.status} != 'Closed'`)),
      db.select({ count: count() }).from(activities).where(and(actConditions, eq(activities.status, "Selesai"))),
      db.select({ count: count() }).from(cases).where(and(caseConditions, eq(cases.status, "Closed"))),
      db.select({ count: count() }).from(cases).where(waitingCondition),
      db.select({ count: count() }).from(cases).where(and(waitingCondition, sql`${cases.updatedAt} < ${thirtyDaysAgo}`)),
      db.select({ count: count() }).from(tasks).where(taskConditions),
      db.select({ count: count() }).from(tasks).where(and(taskConditions, sql`${tasks.status} != 'Selesai'`)),
      db.select({ count: count() }).from(tasks).where(and(taskConditions, eq(tasks.status, "Selesai"))),
      db.select({ count: count() }).from(announcements).where(eq(announcements.isArchived, false)),
      db.select().from(activities).where(actConditions).orderBy(desc(activities.createdAt)).limit(5),
      db.select().from(cases).where(caseConditions).orderBy(desc(cases.createdAt)).limit(5),
      db.select().from(cases).where(and(caseConditions, eq(cases.riskLevel, "High"), sql`${cases.status} != 'Closed'`)).orderBy(desc(cases.createdAt)).limit(5),
    ]);

    return {
      totalActivities: totalActivities?.count || 0,
      completedActivities: completedActivities?.count || 0,
      totalCases: totalCases?.count || 0,
      activeCases: activeCases?.count || 0,
      closedCases: closedCases?.count || 0,
      overdueCases: overdueCases?.count || 0,
      waitingCases: waitingCases?.count || 0,
      longWaitingCases: longWaitingCases?.count || 0,
      totalTasks: totalTasks?.count || 0,
      pendingTasks: pendingTasks?.count || 0,
      completedTasks: completedTasks?.count || 0,
      totalAnnouncements: totalAnnouncements?.count || 0,
      recentActivities,
      recentCases,
      highRiskCases,
    };
  }

  async getKpiAssessments(userId?: number): Promise<KpiAssessment[]> {
    if (userId) {
      return db.select().from(kpiAssessments).where(eq(kpiAssessments.userId, userId)).orderBy(desc(kpiAssessments.createdAt));
    }
    return db.select().from(kpiAssessments).orderBy(desc(kpiAssessments.createdAt));
  }

  async getKpiAssessment(id: number): Promise<KpiAssessment | undefined> {
    const [kpi] = await db.select().from(kpiAssessments).where(eq(kpiAssessments.id, id));
    return kpi;
  }

  async createKpiAssessment(data: InsertKpiAssessment): Promise<KpiAssessment> {
    const [kpi] = await db.insert(kpiAssessments).values(data).returning();
    return kpi;
  }

  async calculateKpiForUser(userId: number, period: string): Promise<any> {
    const [year, quarter] = period.split("-");
    let startMonth: number, endMonth: number;
    if (quarter === "Q1") { startMonth = 1; endMonth = 3; }
    else if (quarter === "Q2") { startMonth = 4; endMonth = 6; }
    else if (quarter === "Q3") { startMonth = 7; endMonth = 9; }
    else { startMonth = 10; endMonth = 12; }

    const startDate = `${year}-${String(startMonth).padStart(2, "0")}-01`;
    const nextMonth = endMonth === 12 ? 1 : endMonth + 1;
    const nextYear = endMonth === 12 ? parseInt(year) + 1 : parseInt(year);
    const endDateObj = new Date(nextYear, nextMonth - 1, 0);
    const endDate = `${year}-${String(endMonth).padStart(2, "0")}-${String(endDateObj.getDate()).padStart(2, "0")}`;

    const user = await this.getUser(userId);
    const companyId = user?.companyId;

    const actConditions = companyId
      ? and(eq(activities.isArchived, false), eq(activities.createdBy, userId), gte(activities.date, startDate), lte(activities.date, endDate))
      : and(eq(activities.isArchived, false), eq(activities.createdBy, userId));

    const caseConditions = companyId
      ? and(eq(cases.isArchived, false), eq(cases.createdBy, userId), gte(cases.dateReceived, startDate), lte(cases.dateReceived, endDate))
      : and(eq(cases.isArchived, false), eq(cases.createdBy, userId));

    const taskConditions = and(eq(tasks.isArchived, false), eq(tasks.assignedTo, userId));

    const [
      [actTotal], [actCompleted],
      [caseTotal], [caseCompleted],
      [taskTotal], [taskCompleted],
      [actAvgProgress], [caseAvgProgress], [taskAvgProgress],
    ] = await Promise.all([
      db.select({ count: count() }).from(activities).where(actConditions),
      db.select({ count: count() }).from(activities).where(and(actConditions, eq(activities.status, "Selesai"))),
      db.select({ count: count() }).from(cases).where(caseConditions),
      db.select({ count: count() }).from(cases).where(and(caseConditions, eq(cases.status, "Closed"))),
      db.select({ count: count() }).from(tasks).where(taskConditions),
      db.select({ count: count() }).from(tasks).where(and(taskConditions, eq(tasks.status, "Selesai"))),
      db.select({ avg: sql<number>`COALESCE(AVG(${activities.progress}), 0)` }).from(activities).where(actConditions),
      db.select({ avg: sql<number>`COALESCE(AVG(${cases.progress}), 0)` }).from(cases).where(caseConditions),
      db.select({ avg: sql<number>`COALESCE(AVG(${tasks.progress}), 0)` }).from(tasks).where(taskConditions),
    ]);

    const avgP = Math.round(((Number(actAvgProgress?.avg) || 0) + (Number(caseAvgProgress?.avg) || 0) + (Number(taskAvgProgress?.avg) || 0)) / 3);

    return {
      activitiesTotal: actTotal?.count || 0,
      activitiesCompleted: actCompleted?.count || 0,
      casesTotal: caseTotal?.count || 0,
      casesCompleted: caseCompleted?.count || 0,
      tasksTotal: taskTotal?.count || 0,
      tasksCompleted: taskCompleted?.count || 0,
      avgProgress: avgP,
    };
  }

  async calculateLiveKpi(userId: number): Promise<any> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User tidak ditemukan");

    const actBase = and(eq(activities.isArchived, false), eq(activities.createdBy, userId));
    const caseBase = and(eq(cases.isArchived, false), eq(cases.createdBy, userId));
    const taskBase = and(eq(tasks.isArchived, false), eq(tasks.assignedTo, userId));

    const today = new Date().toISOString().split("T")[0];

    const [
      [actTotal], [actCompleted],
      [caseTotal], [caseCompleted],
      [taskTotal], [taskCompleted],
      [actAvg], [caseAvg], [taskAvg],
      [taskOnTime], [taskWithDeadline],
      [actOnTime], [actWithTarget],
      [caseOnTime], [caseWithTarget],
      [taskOverdue],
      [caseOverdue],
      [actOverdue],
    ] = await Promise.all([
      db.select({ count: count() }).from(activities).where(actBase),
      db.select({ count: count() }).from(activities).where(and(actBase, eq(activities.status, "Selesai"))),
      db.select({ count: count() }).from(cases).where(caseBase),
      db.select({ count: count() }).from(cases).where(and(caseBase, eq(cases.status, "Closed"))),
      db.select({ count: count() }).from(tasks).where(taskBase),
      db.select({ count: count() }).from(tasks).where(and(taskBase, eq(tasks.status, "Selesai"))),
      db.select({ avg: sql<number>`COALESCE(AVG(${activities.progress}), 0)` }).from(activities).where(actBase),
      db.select({ avg: sql<number>`COALESCE(AVG(${cases.progress}), 0)` }).from(cases).where(caseBase),
      db.select({ avg: sql<number>`COALESCE(AVG(${tasks.progress}), 0)` }).from(tasks).where(taskBase),
      db.select({ count: count() }).from(tasks).where(and(taskBase, eq(tasks.status, "Selesai"), sql`${tasks.updatedAt}::date <= ${tasks.deadline}::date`)),
      db.select({ count: count() }).from(tasks).where(and(taskBase, sql`${tasks.deadline} IS NOT NULL`)),
      db.select({ count: count() }).from(activities).where(and(actBase, eq(activities.status, "Selesai"), sql`${activities.updatedAt}::date <= COALESCE(${activities.targetDate}::date, ${activities.updatedAt}::date)`)),
      db.select({ count: count() }).from(activities).where(and(actBase, sql`${activities.targetDate} IS NOT NULL`)),
      db.select({ count: count() }).from(cases).where(and(caseBase, eq(cases.status, "Closed"), sql`${cases.updatedAt}::date <= COALESCE(${cases.targetDate}::date, ${cases.updatedAt}::date)`)),
      db.select({ count: count() }).from(cases).where(and(caseBase, sql`${cases.targetDate} IS NOT NULL`)),
      db.select({ count: count() }).from(tasks).where(and(taskBase, sql`${tasks.status} != 'Selesai'`, sql`${tasks.deadline}::date < ${today}::date`)),
      db.select({ count: count() }).from(cases).where(and(caseBase, sql`${cases.status} != 'Closed'`, sql`${cases.targetDate}::date < ${today}::date`)),
      db.select({ count: count() }).from(activities).where(and(actBase, sql`${activities.status} != 'Selesai'`, sql`${activities.targetDate}::date < ${today}::date`)),
    ]);

    const aTotal = actTotal?.count || 0;
    const aCompleted = actCompleted?.count || 0;
    const cTotal = caseTotal?.count || 0;
    const cCompleted = caseCompleted?.count || 0;
    const tTotal = taskTotal?.count || 0;
    const tCompleted = taskCompleted?.count || 0;

    const totalItems = aTotal + cTotal + tTotal;

    if (totalItems === 0) {
      const zeroScores = {
        penyelesaianTugas: 0, penyelesaianKasus: 0, penyelesaianAktivitas: 0,
        ketepatanWaktu: 0, progressRataRata: 0, responsivitas: 0, bebanKerja: 0, konsistensi: 0,
      };
      return {
        userId, fullName: user.fullName, role: user.role, companyId: user.companyId,
        scores: zeroScores, totalScore: 0,
        details: { activitiesTotal: 0, activitiesCompleted: 0, casesTotal: 0, casesCompleted: 0,
          tasksTotal: 0, tasksCompleted: 0, avgProgress: 0, totalOverdue: 0, totalOnTime: 0, totalWithDeadline: 0, totalItems: 0 },
      };
    }

    const penyelesaianTugas = tTotal > 0 ? Math.round((tCompleted / tTotal) * 100) : 0;
    const penyelesaianKasus = cTotal > 0 ? Math.round((cCompleted / cTotal) * 100) : 0;
    const penyelesaianAktivitas = aTotal > 0 ? Math.round((aCompleted / aTotal) * 100) : 0;

    const totalWithDeadline = (taskWithDeadline?.count || 0) + (actWithTarget?.count || 0) + (caseWithTarget?.count || 0);
    const totalOnTime = (taskOnTime?.count || 0) + (actOnTime?.count || 0) + (caseOnTime?.count || 0);
    const ketepatanWaktu = totalWithDeadline > 0 ? Math.round((totalOnTime / totalWithDeadline) * 100) : 0;

    const progressParts: number[] = [];
    if (aTotal > 0) progressParts.push(Number(actAvg?.avg) || 0);
    if (cTotal > 0) progressParts.push(Number(caseAvg?.avg) || 0);
    if (tTotal > 0) progressParts.push(Number(taskAvg?.avg) || 0);
    const avgProgress = progressParts.length > 0 ? Math.round(progressParts.reduce((a, b) => a + b, 0) / progressParts.length) : 0;

    const totalOverdue = (taskOverdue?.count || 0) + (caseOverdue?.count || 0) + (actOverdue?.count || 0);
    const totalActive = (tTotal - tCompleted) + (cTotal - cCompleted) + (aTotal - aCompleted);
    const responsivitas = totalActive > 0 ? Math.round(Math.max(0, 100 - (totalOverdue / totalActive) * 100)) : 100;

    const CAPACITY_THRESHOLD = 20;
    const bebanKerja = Math.min(100, Math.round((totalItems / CAPACITY_THRESHOLD) * 100));

    const completedTotal = aCompleted + cCompleted + tCompleted;
    const konsistensi = Math.round(Math.min(100, (completedTotal / totalItems) * 100));

    const scores = {
      penyelesaianTugas,
      penyelesaianKasus,
      penyelesaianAktivitas,
      ketepatanWaktu,
      progressRataRata: avgProgress,
      responsivitas,
      bebanKerja,
      konsistensi,
    };

    const totalScore = Math.round(
      (penyelesaianTugas * 0.15) +
      (penyelesaianKasus * 0.20) +
      (penyelesaianAktivitas * 0.15) +
      (ketepatanWaktu * 0.15) +
      (avgProgress * 0.10) +
      (responsivitas * 0.10) +
      (bebanKerja * 0.05) +
      (konsistensi * 0.10)
    );

    return {
      userId,
      fullName: user.fullName,
      role: user.role,
      companyId: user.companyId,
      scores,
      totalScore,
      details: {
        activitiesTotal: aTotal,
        activitiesCompleted: aCompleted,
        casesTotal: cTotal,
        casesCompleted: cCompleted,
        tasksTotal: tTotal,
        tasksCompleted: tCompleted,
        avgProgress,
        totalOverdue,
        totalOnTime,
        totalWithDeadline,
        totalItems,
      },
    };
  }

  async getMeetingsByCase(caseId: number): Promise<CaseMeeting[]> {
    return db.select().from(caseMeetings).where(eq(caseMeetings.caseId, caseId)).orderBy(desc(caseMeetings.meetingDate));
  }

  async createMeeting(data: InsertCaseMeeting): Promise<CaseMeeting> {
    const [meeting] = await db.insert(caseMeetings).values(data).returning();
    return meeting;
  }

  async deleteMeeting(id: number): Promise<void> {
    await db.delete(caseMeetings).where(eq(caseMeetings.id, id));
  }

  async getPushSubscriptions(userId: number): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async savePushSubscription(userId: number, endpoint: string, p256dh: string, auth: string): Promise<PushSubscription> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    const [sub] = await db.insert(pushSubscriptions).values({ userId, endpoint, p256dh, auth }).returning();
    return sub;
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async deletePushSubscriptionByUser(userId: number, endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
  }

  async transaction<T>(fn: (tx: TxOrDb) => Promise<T>): Promise<T> {
    return db.transaction(fn);
  }
}

export const storage = new DatabaseStorage();
