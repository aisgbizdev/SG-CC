import bcrypt from "bcrypt";
import { storage } from "./storage";
import { db } from "./db";
import { users, companies, masterCategories, activities, cases, tasks, announcements, notifications, comments, caseUpdates, announcementReads, messages, auditLogs } from "@shared/schema";
import { count } from "drizzle-orm";

export async function seedData() {
  const [existing] = await db.select({ count: count() }).from(users);
  if (existing && existing.count > 0) return;

  console.log("Seeding data awal...");
  const pw = await bcrypt.hash("admin123", 10);

  const c1 = await storage.createCompany({ name: "PT Solid Gold Berjangka", code: "SGB", isActive: true });
  const c2 = await storage.createCompany({ name: "PT Rifan Financindo Berjangka", code: "RFB", isActive: true });
  const c3 = await storage.createCompany({ name: "PT Best Profit Futures", code: "BPF", isActive: true });
  const c4 = await storage.createCompany({ name: "PT Kontak Perkasa Futures", code: "KPF", isActive: true });
  const c5 = await storage.createCompany({ name: "PT Equityworld Futures", code: "EWF", isActive: true });

  const sa = await storage.createUser({ username: "superadmin", password: pw, fullName: "System Admin", role: "superadmin", companyId: null, secretQuestion: "Nama ibu kandung", secretAnswer: "admin", isActive: true });

  const ow1 = await storage.createUser({ username: "nelson", password: pw, fullName: "Nelson Lee", role: "owner", companyId: null, secretQuestion: "Nama ibu kandung", secretAnswer: "owner", isActive: true });
  const ow2 = await storage.createUser({ username: "hambali", password: pw, fullName: "Hambali", role: "owner", companyId: null, secretQuestion: "Nama ibu kandung", secretAnswer: "owner", isActive: true });
  const ow3 = await storage.createUser({ username: "masir", password: pw, fullName: "Mas IR", role: "owner", companyId: null, secretQuestion: "Nama ibu kandung", secretAnswer: "owner", isActive: true });
  const ow4 = await storage.createUser({ username: "dr", password: pw, fullName: "DR", role: "owner", companyId: null, secretQuestion: "Nama ibu kandung", secretAnswer: "owner", isActive: true });
  const ow5 = await storage.createUser({ username: "bw", password: pw, fullName: "BW", role: "owner", companyId: null, secretQuestion: "Nama ibu kandung", secretAnswer: "owner", isActive: true });

  const du_sgb = await storage.createUser({ username: "du_sgb", password: pw, fullName: "DU PT SGB", role: "du", companyId: c1.id, secretQuestion: "Kota lahir", secretAnswer: "jakarta", isActive: true });
  const dk_sgb = await storage.createUser({ username: "dk_sgb", password: pw, fullName: "DK PT SGB", role: "dk", companyId: c1.id, secretQuestion: "Kota lahir", secretAnswer: "jakarta", isActive: true });

  const du_rfb = await storage.createUser({ username: "du_rfb", password: pw, fullName: "DU PT RFB", role: "du", companyId: c2.id, secretQuestion: "Kota lahir", secretAnswer: "jakarta", isActive: true });
  const dk_rfb = await storage.createUser({ username: "dk_rfb", password: pw, fullName: "DK PT RFB", role: "dk", companyId: c2.id, secretQuestion: "Kota lahir", secretAnswer: "jakarta", isActive: true });

  const du_bpf = await storage.createUser({ username: "du_bpf", password: pw, fullName: "DU PT BPF", role: "du", companyId: c3.id, secretQuestion: "Kota lahir", secretAnswer: "jakarta", isActive: true });
  const dk_bpf = await storage.createUser({ username: "dk_bpf", password: pw, fullName: "DK PT BPF", role: "dk", companyId: c3.id, secretQuestion: "Kota lahir", secretAnswer: "jakarta", isActive: true });

  const du_kpf = await storage.createUser({ username: "du_kpf", password: pw, fullName: "DU PT KPF", role: "du", companyId: c4.id, secretQuestion: "Kota lahir", secretAnswer: "jakarta", isActive: true });
  const dk_kpf = await storage.createUser({ username: "dk_kpf", password: pw, fullName: "DK PT KPF", role: "dk", companyId: c4.id, secretQuestion: "Kota lahir", secretAnswer: "jakarta", isActive: true });

  const du_ewf = await storage.createUser({ username: "du_ewf", password: pw, fullName: "DU PT EWF", role: "du", companyId: c5.id, secretQuestion: "Kota lahir", secretAnswer: "jakarta", isActive: true });
  const dk_ewf = await storage.createUser({ username: "dk_ewf", password: pw, fullName: "DK PT EWF", role: "dk", companyId: c5.id, secretQuestion: "Kota lahir", secretAnswer: "jakarta", isActive: true });

  const cats = [
    { name: "Audit Cabang", type: "activity" },
    { name: "Review Pengaduan", type: "activity" },
    { name: "Mediasi", type: "activity" },
    { name: "Meeting Regulator", type: "activity" },
    { name: "Koordinasi Internal", type: "activity" },
    { name: "Penyusunan Laporan", type: "activity" },
    { name: "Evaluasi Kepatuhan", type: "activity" },
    { name: "Tindakan Korektif", type: "activity" },
    { name: "Monitoring Kasus", type: "activity" },
    { name: "Pengawasan Cabang", type: "activity" },
  ];
  for (const cat of cats) {
    await storage.createCategory({ name: cat.name, type: cat.type, isActive: true });
  }


  await db.execute(`UPDATE users SET profile_completed = true WHERE role IN ('superadmin', 'owner')`);

  console.log("Seed data selesai!");
}
