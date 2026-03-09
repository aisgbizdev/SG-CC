import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, date, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const companies = pgTable("companies", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  directorName: text("director_name"),
  foundedDate: text("founded_date"),
  licenseNumber: text("license_number"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertCompanySchema = createInsertSchema(companies).omit({ id: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export const branches = pgTable("branches", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  address: text("address"),
  headName: text("head_name"),
  wpbCount: integer("wpb_count").default(0),
  isActive: boolean("is_active").notNull().default(true),
}, (table) => [
  index("idx_branches_company_id").on(table.companyId),
]);

export const insertBranchSchema = createInsertSchema(branches).omit({ id: true });
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branches.$inferSelect;

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(), // superadmin, owner, du, dk
  companyId: integer("company_id"),
  phone: text("phone"),
  address: text("address"),
  birthDate: text("birth_date"),
  branchCount: integer("branch_count"),
  position: text("position"),
  avatarUrl: text("avatar_url"),
  profileCompleted: boolean("profile_completed").notNull().default(false),
  secretQuestion: text("secret_question"),
  secretAnswer: text("secret_answer"),
  isActive: boolean("is_active").notNull().default(true),
  loginAttempts: integer("login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_users_company_id").on(table.companyId),
  index("idx_users_role").on(table.role),
]);

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, loginAttempts: true, lockedUntil: true, lastLogin: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const masterCategories = pgTable("master_categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  type: text("type").notNull(), // activity, case
  isActive: boolean("is_active").notNull().default(true),
});

export const insertMasterCategorySchema = createInsertSchema(masterCategories).omit({ id: true });
export type InsertMasterCategory = z.infer<typeof insertMasterCategorySchema>;
export type MasterCategory = typeof masterCategories.$inferSelect;

export const activities = pgTable("activities", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  companyId: integer("company_id").notNull(),
  createdBy: integer("created_by").notNull(),
  date: date("date").notNull(),
  categoryId: integer("category_id"),
  title: text("title").notNull(),
  description: text("description"),
  result: text("result"),
  status: text("status").notNull().default("Direncanakan"),
  priority: text("priority").notNull().default("Medium"),
  progress: integer("progress").notNull().default(0),
  targetDate: date("target_date"),
  nextAction: text("next_action"),
  notes: text("notes"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_activities_company_id").on(table.companyId),
  index("idx_activities_created_by").on(table.createdBy),
  index("idx_activities_archived_company").on(table.isArchived, table.companyId),
]);

export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true, updatedAt: true, isArchived: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export const cases = pgTable("cases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  companyId: integer("company_id").notNull(),
  createdBy: integer("created_by").notNull(),
  caseCode: text("case_code").notNull().unique(),
  branch: text("branch"),
  dateReceived: date("date_received").notNull(),
  customerName: text("customer_name").notNull(),
  accountNumber: text("account_number"),
  picMain: text("pic_main"),
  bucket: text("bucket").notNull().default("Pemeriksaan Pengaduan Baru"),
  status: text("status").notNull().default("Open"),
  summary: text("summary").notNull(),
  riskLevel: text("risk_level").notNull().default("Low"),
  priority: text("priority").notNull().default("Medium"),
  workflowStage: text("workflow_stage").notNull().default("Open"),
  progress: integer("progress").notNull().default(0),
  targetDate: date("target_date"),
  findings: text("findings"),
  rootCause: text("root_cause"),
  customerRequest: text("customer_request"),
  companyOffer: text("company_offer"),
  settlementResult: text("settlement_result"),
  latestAction: text("latest_action"),
  nextAction: text("next_action"),
  ownerNote: text("owner_note"),
  duNote: text("du_note"),
  dkNote: text("dk_note"),
  wpbName: text("wpb_name"),
  managerName: text("manager_name"),
  resolutionPath: text("resolution_path").notNull().default("Belum Ditentukan"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_cases_company_id").on(table.companyId),
  index("idx_cases_created_by").on(table.createdBy),
  index("idx_cases_archived_company").on(table.isArchived, table.companyId),
  index("idx_cases_status").on(table.status),
]);

export const insertCaseSchema = createInsertSchema(cases).omit({ id: true, createdAt: true, updatedAt: true, isArchived: true });
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof cases.$inferSelect;

export const caseMeetings = pgTable("case_meetings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  caseId: integer("case_id").notNull(),
  meetingDate: date("meeting_date").notNull(),
  meetingType: text("meeting_type").notNull(),
  participants: text("participants"),
  location: text("location"),
  result: text("result"),
  notes: text("notes"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_case_meetings_case_id").on(table.caseId),
]);

export const insertCaseMeetingSchema = createInsertSchema(caseMeetings).omit({ id: true, createdAt: true });
export type InsertCaseMeeting = z.infer<typeof insertCaseMeetingSchema>;
export type CaseMeeting = typeof caseMeetings.$inferSelect;

export const caseUpdates = pgTable("case_updates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  caseId: integer("case_id").notNull(),
  createdBy: integer("created_by").notNull(),
  content: text("content").notNull(),
  newStage: text("new_stage"),
  newProgress: integer("new_progress"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_case_updates_case_id").on(table.caseId),
]);

export const insertCaseUpdateSchema = createInsertSchema(caseUpdates).omit({ id: true, createdAt: true });
export type InsertCaseUpdate = z.infer<typeof insertCaseUpdateSchema>;
export type CaseUpdate = typeof caseUpdates.$inferSelect;

export const tasks = pgTable("tasks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  companyId: integer("company_id"),
  createdBy: integer("created_by").notNull(),
  assignedTo: integer("assigned_to").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull().default("Medium"),
  status: text("status").notNull().default("Baru"),
  progress: integer("progress").notNull().default(0),
  deadline: date("deadline"),
  relatedCaseId: integer("related_case_id"),
  relatedActivityId: integer("related_activity_id"),
  notes: text("notes"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_tasks_company_id").on(table.companyId),
  index("idx_tasks_assigned_to").on(table.assignedTo),
  index("idx_tasks_is_archived").on(table.isArchived),
]);

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true, isArchived: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const announcements = pgTable("announcements", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  createdBy: integer("created_by").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  priority: text("priority").notNull().default("Normal"),
  targetType: text("target_type").notNull().default("all"), // all, role, company, user
  targetValue: text("target_value"), // role name, company id, user id
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isPinned: boolean("is_pinned").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_announcements_created_by").on(table.createdBy),
  index("idx_announcements_is_archived").on(table.isArchived),
]);

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true, isArchived: true });
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

export const announcementReads = pgTable("announcement_reads", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  announcementId: integer("announcement_id").notNull(),
  userId: integer("user_id").notNull(),
  readAt: timestamp("read_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_announcement_reads_announcement_user").on(table.announcementId, table.userId),
]);

export const insertAnnouncementReadSchema = createInsertSchema(announcementReads).omit({ id: true, readAt: true });
export type InsertAnnouncementRead = z.infer<typeof insertAnnouncementReadSchema>;
export type AnnouncementRead = typeof announcementReads.$inferSelect;

export const comments = pgTable("comments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  entityType: text("entity_type").notNull(), // activity, case, task
  entityId: integer("entity_id").notNull(),
  createdBy: integer("created_by").notNull(),
  content: text("content").notNull(),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_comments_entity").on(table.entityType, table.entityId),
]);

export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true });
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  isRead: boolean("is_read").notNull().default(false),
  priority: text("priority").notNull().default("low"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_notifications_user_read").on(table.userId, table.isRead),
]);

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, isRead: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export const messages = pgTable("messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  subject: text("subject"),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_messages_sender_id").on(table.senderId),
  index("idx_messages_receiver_id").on(table.receiverId),
]);

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, isRead: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const auditLogs = pgTable("audit_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_audit_logs_user_id").on(table.userId),
  index("idx_audit_logs_entity").on(table.entityType, table.entityId),
]);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export const kpiAssessments = pgTable("kpi_assessments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  period: text("period").notNull(),
  assessorId: integer("assessor_id").notNull(),
  activitiesCompleted: integer("activities_completed").notNull().default(0),
  activitiesTotal: integer("activities_total").notNull().default(0),
  casesCompleted: integer("cases_completed").notNull().default(0),
  casesTotal: integer("cases_total").notNull().default(0),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  tasksTotal: integer("tasks_total").notNull().default(0),
  avgProgress: integer("avg_progress").notNull().default(0),
  qualityScore: integer("quality_score").notNull().default(0),
  timelinessScore: integer("timeliness_score").notNull().default(0),
  initiativeScore: integer("initiative_score").notNull().default(0),
  communicationScore: integer("communication_score").notNull().default(0),
  regulationScore: integer("regulation_score").notNull().default(0),
  problemSolvingScore: integer("problem_solving_score").notNull().default(0),
  teamworkScore: integer("teamwork_score").notNull().default(0),
  responsibilityScore: integer("responsibility_score").notNull().default(0),
  totalScore: integer("total_score").notNull().default(0),
  notes: text("notes"),
  strengths: text("strengths"),
  improvements: text("improvements"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_kpi_user_id").on(table.userId),
  index("idx_kpi_period").on(table.period),
]);

export const insertKpiAssessmentSchema = createInsertSchema(kpiAssessments).omit({ id: true, createdAt: true });
export type InsertKpiAssessment = z.infer<typeof insertKpiAssessmentSchema>;
export type KpiAssessment = typeof kpiAssessments.$inferSelect;

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_push_sub_user").on(table.userId),
]);

export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export const loginSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});
export type LoginData = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  secretAnswer: z.string().min(1, "Jawaban wajib diisi"),
  newPassword: z.string().min(8, "Password minimal 8 karakter"),
});
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
