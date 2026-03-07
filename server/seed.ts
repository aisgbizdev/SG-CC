import bcrypt from "bcrypt";
import { storage } from "./storage";
import { db } from "./db";
import { users, companies, masterCategories, activities, cases, tasks, announcements, notifications, comments, caseUpdates, announcementReads, messages, auditLogs } from "@shared/schema";
import { count, eq, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function runMigrations() {
  try {
    await db.execute(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone text`);
    await db.execute(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS email text`);
    await db.execute(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS director_name text`);
    await db.execute(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS founded_date text`);
    await db.execute(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS license_number text`);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS branches (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        company_id integer NOT NULL,
        name text NOT NULL,
        address text,
        head_name text,
        wpb_count integer DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true
      )
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_branches_company_id ON branches(company_id)`);
    console.log("Migrasi schema selesai.");
  } catch (err: any) {
    console.error("Migrasi gagal:", err.message);
  }
}

export async function seedData() {
  await runMigrations();

  const [existing] = await db.select({ count: count() }).from(users);
  if (!existing || existing.count === 0) {
    console.log("Seeding data awal...");
    const pw = await bcrypt.hash("admin123", 10);

    const c1 = await storage.createCompany({ name: "PT Solid Gold Berjangka", code: "SGB", isActive: true });
    const c2 = await storage.createCompany({ name: "PT Rifan Financindo Berjangka", code: "RFB", isActive: true });
    const c3 = await storage.createCompany({ name: "PT Best Profit Futures", code: "BPF", isActive: true });
    const c4 = await storage.createCompany({ name: "PT Kontak Perkasa Futures", code: "KPF", isActive: true });
    const c5 = await storage.createCompany({ name: "PT Equityworld Futures", code: "EWF", isActive: true });

    await storage.createUser({ username: "superadmin", password: pw, fullName: "System Admin", role: "superadmin", companyId: null, secretQuestion: "Nama ibu kandung", secretAnswer: "admin", isActive: true });

    await storage.createUser({ username: "nelson", password: pw, fullName: "Nelson Lee", role: "owner", companyId: null, secretQuestion: "Nama ibu kandung", secretAnswer: "owner", isActive: true });
    await storage.createUser({ username: "hambali", password: pw, fullName: "Hambali", role: "owner", companyId: null, secretQuestion: "Nama ibu kandung", secretAnswer: "owner", isActive: true });
    await storage.createUser({ username: "masir", password: pw, fullName: "Mas IR", role: "owner", companyId: null, secretQuestion: "Nama ibu kandung", secretAnswer: "owner", isActive: true });
    await storage.createUser({ username: "dr", password: pw, fullName: "DR", role: "owner", companyId: null, secretQuestion: "Nama ibu kandung", secretAnswer: "owner", isActive: true });
    await storage.createUser({ username: "bw", password: pw, fullName: "BW", role: "owner", companyId: null, secretQuestion: "Nama ibu kandung", secretAnswer: "owner", isActive: true });

    await storage.createUser({ username: "du_sgb", password: pw, fullName: "DU PT SGB", role: "du", companyId: c1.id, secretQuestion: "Kota lahir", secretAnswer: "jakarta", isActive: true });
    await storage.createUser({ username: "dk_sgb", password: pw, fullName: "DK PT SGB", role: "dk", companyId: c1.id, secretQuestion: "Kota lahir", secretAnswer: "jakarta", isActive: true });

    await storage.createUser({ username: "du_rfb", password: pw, fullName: "DU PT RFB", role: "du", companyId: c2.id, secretQuestion: "Kota lahir", secretAnswer: "jakarta", isActive: true });
    await storage.createUser({ username: "dk_rfb", password: pw, fullName: "DK PT RFB", role: "dk", companyId: c2.id, secretQuestion: "Kota lahir", secretAnswer: "jakarta", isActive: true });

    await storage.createUser({ username: "du_bpf", password: pw, fullName: "DU PT BPF", role: "du", companyId: c3.id, secretQuestion: "Kota lahir", secretAnswer: "jakarta", isActive: true });
    await storage.createUser({ username: "dk_bpf", password: pw, fullName: "DK PT BPF", role: "dk", companyId: c3.id, secretQuestion: "Kota lahir", secretAnswer: "jakarta", isActive: true });

    await storage.createUser({ username: "du_kpf", password: pw, fullName: "DU PT KPF", role: "du", companyId: c4.id, secretQuestion: "Kota lahir", secretAnswer: "jakarta", isActive: true });
    await storage.createUser({ username: "dk_kpf", password: pw, fullName: "DK PT KPF", role: "dk", companyId: c4.id, secretQuestion: "Kota lahir", secretAnswer: "jakarta", isActive: true });

    await storage.createUser({ username: "du_ewf", password: pw, fullName: "DU PT EWF", role: "du", companyId: c5.id, secretQuestion: "Kota lahir", secretAnswer: "jakarta", isActive: true });
    await storage.createUser({ username: "dk_ewf", password: pw, fullName: "DK PT EWF", role: "dk", companyId: c5.id, secretQuestion: "Kota lahir", secretAnswer: "jakarta", isActive: true });

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

    console.log("Seed data awal selesai!");
  }

  await seedCasesFromJson();
  await verifyDataIntegrity();
}

async function seedCasesFromJson() {
  const jsonPath = path.join(process.cwd(), "server", "seed-cases.json");
  if (!fs.existsSync(jsonPath)) {
    console.log("seed-cases.json tidak ditemukan, skip seed kasus.");
    return;
  }

  const [activeCaseCount] = await db.select({ count: count() }).from(cases).where(eq(cases.isArchived, false));
  if (activeCaseCount && activeCaseCount.count >= 100) {
    return;
  }

  console.log("Seeding kasus pengaduan dari seed-cases.json...");

  const sampleCodes = ["SGB-2024-001", "RFB-2024-001", "BPF-2024-001"];
  for (const code of sampleCodes) {
    await db.update(cases).set({ isArchived: true }).where(eq(cases.caseCode, code));
  }
  await db.update(activities).set({ isArchived: true }).where(eq(activities.isArchived, false));
  await db.update(tasks).set({ isArchived: true }).where(eq(tasks.isArchived, false));
  await db.update(announcements).set({ isArchived: true }).where(eq(announcements.isArchived, false));
  console.log("Data sample lama diarsipkan.");

  const existingCases = await db.select({ caseCode: cases.caseCode }).from(cases);
  const existingCodes = new Set(existingCases.map(c => c.caseCode));

  const companyList = await storage.getCompanies();
  const companyMap: Record<string, number> = {};
  for (const c of companyList) {
    companyMap[c.code] = c.id;
  }

  const userList = await storage.getUsers();
  const dkUserMap: Record<number, number> = {};
  for (const u of userList) {
    if (u.role === "dk" && u.companyId) {
      dkUserMap[u.companyId] = u.id;
    }
  }

  const seedCases = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  let inserted = 0;
  let skipped = 0;

  for (const c of seedCases) {
    if (existingCodes.has(c.case_code)) {
      skipped++;
      continue;
    }

    const companyCode = c.case_code.split("-")[0];
    const companyId = companyMap[companyCode] || c.company_id;
    const createdBy = dkUserMap[companyId] || c.created_by;

    await db.insert(cases).values({
      caseCode: c.case_code,
      companyId: companyId,
      createdBy: createdBy,
      branch: c.branch || null,
      customerName: c.customer_name || null,
      accountNumber: c.account_number || null,
      dateReceived: c.date_received || null,
      picMain: c.pic_main || null,
      bucket: c.bucket || "Pemeriksaan Pengaduan Baru",
      status: c.status || "Open",
      summary: c.summary || null,
      riskLevel: c.risk_level || "Medium",
      priority: c.priority || "Medium",
      workflowStage: c.workflow_stage || "Open",
      progress: c.progress || 0,
      findings: c.findings || null,
      rootCause: c.root_cause || null,
      customerRequest: c.customer_request || null,
      companyOffer: c.company_offer || null,
      settlementResult: c.settlement_result || null,
      latestAction: c.latest_action || null,
      nextAction: c.next_action || null,
      ownerNote: c.owner_note || null,
      duNote: c.du_note || null,
      dkNote: c.dk_note || null,
      isArchived: false,
    });
    inserted++;
  }

  console.log(`Seed kasus selesai: ${inserted} ditambahkan, ${skipped} sudah ada (skip).`);
}

async function verifyDataIntegrity() {
  const [caseCount] = await db.select({ count: count() }).from(cases).where(eq(cases.isArchived, false));
  const [activityCount] = await db.select({ count: count() }).from(activities).where(eq(activities.isArchived, false));
  const [taskCount] = await db.select({ count: count() }).from(tasks).where(eq(tasks.isArchived, false));
  const [announcementCount] = await db.select({ count: count() }).from(announcements).where(eq(announcements.isArchived, false));
  const [userCount] = await db.select({ count: count() }).from(users).where(eq(users.isActive, true));
  const [companyCount] = await db.select({ count: count() }).from(companies).where(eq(companies.isActive, true));

  console.log("=== VERIFIKASI DATA ===");
  console.log(`Users aktif: ${userCount?.count || 0}`);
  console.log(`Perusahaan aktif: ${companyCount?.count || 0}`);
  console.log(`Kasus aktif: ${caseCount?.count || 0}`);
  console.log(`Aktivitas aktif: ${activityCount?.count || 0}`);
  console.log(`Tugas aktif: ${taskCount?.count || 0}`);
  console.log(`Pengumuman aktif: ${announcementCount?.count || 0}`);

  const jsonPath = path.join(process.cwd(), "server", "seed-cases.json");
  if (fs.existsSync(jsonPath)) {
    const seedCases = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const expectedCount = seedCases.length;
    const actualCount = caseCount?.count || 0;
    if (actualCount < expectedCount) {
      console.warn(`⚠ PERINGATAN: Kasus aktif (${actualCount}) kurang dari expected (${expectedCount}). Data mungkin belum lengkap!`);
    } else {
      console.log(`✓ Data kasus lengkap (${actualCount}/${expectedCount})`);
    }
  }

  if ((userCount?.count || 0) < 12) {
    console.warn("⚠ PERINGATAN: Users aktif kurang dari 12. Ada masalah dengan data user!");
  }
  if ((companyCount?.count || 0) < 5) {
    console.warn("⚠ PERINGATAN: Perusahaan aktif kurang dari 5. Ada masalah dengan data perusahaan!");
  }

  console.log("=== VERIFIKASI SELESAI ===");
}
