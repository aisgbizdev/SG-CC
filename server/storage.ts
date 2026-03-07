import { db } from "./db";
import { eq, and, desc, or, sql, count, isNull, gte, lte } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  companies, users, masterCategories, activities, cases, caseUpdates,
  tasks, announcements, announcementReads, comments, notifications, messages, auditLogs,
  type InsertCompany, type Company, type InsertUser, type User,
  type InsertMasterCategory, type MasterCategory,
  type InsertActivity, type Activity, type InsertCase, type Case,
  type InsertCaseUpdate, type CaseUpdate, type InsertTask, type Task,
  type InsertAnnouncement, type Announcement, type InsertAnnouncementRead, type AnnouncementRead,
  type InsertComment, type Comment, type InsertNotification, type Notification,
  type InsertMessage, type Message, type InsertAuditLog, type AuditLog,
} from "@shared/schema";
import * as schema from "@shared/schema";

type TxOrDb = NodePgDatabase<typeof schema>;

export interface IStorage {
  getCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(data: InsertCompany): Promise<Company>;

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
  getAnnouncementReads(announcementId: number): Promise<AnnouncementRead[]>;
  markAnnouncementRead(data: InsertAnnouncementRead): Promise<AnnouncementRead>;

  getComments(entityType: string, entityId: number): Promise<Comment[]>;
  createComment(data: InsertComment): Promise<Comment>;

  getNotifications(userId: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  createNotification(data: InsertNotification, tx?: TxOrDb): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;
  markAllNotificationsRead(userId: number): Promise<void>;

  getMessages(userId: number): Promise<Message[]>;
  createMessage(data: InsertMessage, tx?: TxOrDb): Promise<Message>;
  markMessageRead(id: number): Promise<void>;

  createAuditLog(data: InsertAuditLog, tx?: TxOrDb): Promise<AuditLog>;

  getDashboardStats(companyId?: number): Promise<any>;

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
    const [ann] = await db.select().from(announcements).where(eq(announcements.id, id));
    return ann;
  }

  async createAnnouncement(data: InsertAnnouncement): Promise<Announcement> {
    const [ann] = await db.insert(announcements).values(data).returning();
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

    const [
      [totalActivities],
      [totalCases],
      [activeCases],
      [overdueCases],
      [totalTasks],
      [pendingTasks],
      [totalAnnouncements],
      recentActivities,
      recentCases,
      highRiskCases,
    ] = await Promise.all([
      db.select({ count: count() }).from(activities).where(actConditions),
      db.select({ count: count() }).from(cases).where(caseConditions),
      db.select({ count: count() }).from(cases).where(and(caseConditions, sql`${cases.status} != 'Closed'`)),
      db.select({ count: count() }).from(cases).where(and(caseConditions, sql`${cases.targetDate} < ${today}`, sql`${cases.status} != 'Closed'`)),
      db.select({ count: count() }).from(tasks).where(taskConditions),
      db.select({ count: count() }).from(tasks).where(and(taskConditions, sql`${tasks.status} != 'Selesai'`)),
      db.select({ count: count() }).from(announcements).where(eq(announcements.isArchived, false)),
      db.select().from(activities).where(actConditions).orderBy(desc(activities.createdAt)).limit(5),
      db.select().from(cases).where(caseConditions).orderBy(desc(cases.createdAt)).limit(5),
      db.select().from(cases).where(and(caseConditions, eq(cases.riskLevel, "High"), sql`${cases.status} != 'Closed'`)).orderBy(desc(cases.createdAt)).limit(5),
    ]);

    return {
      totalActivities: totalActivities?.count || 0,
      totalCases: totalCases?.count || 0,
      activeCases: activeCases?.count || 0,
      overdueCases: overdueCases?.count || 0,
      totalTasks: totalTasks?.count || 0,
      pendingTasks: pendingTasks?.count || 0,
      totalAnnouncements: totalAnnouncements?.count || 0,
      recentActivities,
      recentCases,
      highRiskCases,
    };
  }

  async transaction<T>(fn: (tx: TxOrDb) => Promise<T>): Promise<T> {
    return db.transaction(fn);
  }
}

export const storage = new DatabaseStorage();
