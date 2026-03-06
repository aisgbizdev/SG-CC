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

  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  await storage.createActivity({ companyId: c1.id, createdBy: du_sgb.id, date: today, categoryId: 1, title: "Audit Cabang Jakarta Selatan", description: "Pemeriksaan rutin cabang Jakarta Selatan Q1", result: "Ditemukan 3 temuan minor", status: "Sedang Dikerjakan", priority: "High", progress: 60, targetDate: nextWeek, nextAction: "Follow up temuan", notes: null });
  await storage.createActivity({ companyId: c1.id, createdBy: dk_sgb.id, date: lastWeek, categoryId: 2, title: "Review Pengaduan Nasabah PT ABC", description: "Pengaduan terkait layanan investasi", result: "Sedang proses verifikasi", status: "Menunggu Review", priority: "Medium", progress: 40, targetDate: today, nextAction: "Koordinasi dengan divisi operasi", notes: null });
  await storage.createActivity({ companyId: c2.id, createdBy: du_rfb.id, date: today, categoryId: 5, title: "Koordinasi Internal Divisi Kepatuhan", description: "Rapat koordinasi bulanan", result: "Disepakati timeline perbaikan SOP", status: "Selesai", priority: "Low", progress: 100, targetDate: null, nextAction: null, notes: null });
  await storage.createActivity({ companyId: c3.id, createdBy: du_bpf.id, date: today, categoryId: 4, title: "Meeting BAPPEBTI Kuartal 1", description: "Pertemuan rutin dengan regulator", result: null, status: "Direncanakan", priority: "High", progress: 0, targetDate: nextWeek, nextAction: "Siapkan materi presentasi", notes: null });
  await storage.createActivity({ companyId: c4.id, createdBy: dk_kpf.id, date: lastWeek, categoryId: 7, title: "Evaluasi Kepatuhan Internal KPF", description: "Evaluasi kepatuhan terhadap peraturan BAPPEBTI", result: "Sebagian besar sudah sesuai", status: "Selesai", priority: "Medium", progress: 100, targetDate: null, nextAction: null, notes: null });
  await storage.createActivity({ companyId: c5.id, createdBy: du_ewf.id, date: today, categoryId: 10, title: "Pengawasan Cabang Surabaya", description: "Monitoring operasional cabang Surabaya", result: null, status: "Sedang Dikerjakan", priority: "Medium", progress: 30, targetDate: nextWeek, nextAction: "Visit cabang minggu depan", notes: null });

  await storage.createCase({ companyId: c1.id, createdBy: dk_sgb.id, caseCode: "SGB-2024-001", branch: "Jakarta Selatan", dateReceived: lastWeek, customerName: "Ahmad Sulaiman", accountNumber: "1234567890", picMain: dk_sgb.fullName, bucket: "Proses Negosiasi / Mediasi", status: "In Progress", summary: "Nasabah mengadukan kerugian investasi sebesar Rp 50 juta", riskLevel: "High", priority: "High", workflowStage: "Negosiasi", progress: 60, targetDate: nextWeek, findings: "Ditemukan kesalahan informasi produk oleh marketing", rootCause: "Misleading promise", customerRequest: "Pengembalian dana investasi penuh", companyOffer: "Pengembalian 70% dana investasi", settlementResult: null, latestAction: "Negosiasi dengan nasabah", nextAction: "Follow up negosiasi minggu depan", ownerNote: null, duNote: "Perlu perhatian khusus", dkNote: "Sudah koordinasi dengan legal" });
  await storage.createCase({ companyId: c2.id, createdBy: du_rfb.id, caseCode: "RFB-2024-001", branch: "Bandung", dateReceived: today, customerName: "Siti Nurhaliza", accountNumber: "9876543210", picMain: du_rfb.fullName, bucket: "Pemeriksaan Pengaduan Baru", status: "Open", summary: "Pengaduan terkait biaya transaksi yang tidak sesuai", riskLevel: "Medium", priority: "Medium", workflowStage: "Open", progress: 10, targetDate: nextWeek, findings: null, rootCause: null, customerRequest: "Pengembalian kelebihan biaya", companyOffer: null, settlementResult: null, latestAction: "Registrasi pengaduan", nextAction: "Pemeriksaan internal", ownerNote: null, duNote: null, dkNote: null });
  await storage.createCase({ companyId: c3.id, createdBy: dk_bpf.id, caseCode: "BPF-2024-001", branch: "Surabaya", dateReceived: lastWeek, customerName: "Bambang Sutrisno", accountNumber: null, picMain: dk_bpf.fullName, bucket: "Disetujui untuk Perdamaian", status: "In Progress", summary: "Nasabah merasa dirugikan atas transaksi forex", riskLevel: "Low", priority: "Low", workflowStage: "Review", progress: 45, targetDate: nextWeek, findings: "Nasabah tidak memahami risiko produk", rootCause: "KYC issue", customerRequest: "Pengembalian modal awal", companyOffer: "Kompensasi sebagian", settlementResult: null, latestAction: "Review dokumen transaksi", nextAction: "Finalisasi penawaran", ownerNote: null, duNote: null, dkNote: null });

  await storage.createTask({ companyId: c1.id, createdBy: ow1.id, assignedTo: du_sgb.id, title: "Siapkan Laporan Bulanan Januari", description: "Laporan bulanan untuk bulan Januari harus diserahkan ke owner", priority: "High", status: "Sedang Dikerjakan", progress: 30, deadline: nextWeek, relatedCaseId: null, relatedActivityId: null, notes: "Pastikan semua data kasus lengkap" });
  await storage.createTask({ companyId: c1.id, createdBy: sa.id, assignedTo: dk_sgb.id, title: "Tindak Lanjut Kasus SGB-2024-001", description: "Follow up negosiasi dengan nasabah Ahmad Sulaiman", priority: "High", status: "Baru", progress: 0, deadline: today, relatedCaseId: 1, relatedActivityId: null, notes: null });
  await storage.createTask({ companyId: c2.id, createdBy: ow2.id, assignedTo: du_rfb.id, title: "Review SOP Transaksi Berjangka", description: "Review dan update SOP proses transaksi", priority: "Medium", status: "Baru", progress: 0, deadline: nextWeek, relatedCaseId: null, relatedActivityId: null, notes: null });
  await storage.createTask({ companyId: c4.id, createdBy: ow4.id, assignedTo: dk_kpf.id, title: "Laporan Kepatuhan Triwulan", description: "Siapkan laporan kepatuhan triwulan untuk BAPPEBTI", priority: "High", status: "Baru", progress: 0, deadline: nextWeek, relatedCaseId: null, relatedActivityId: null, notes: null });

  await storage.createAnnouncement({ createdBy: ow1.id, title: "Rapat Koordinasi Grup Q1 2024", content: "Seluruh Direktur Utama dan Direktur Kepatuhan diharapkan hadir pada rapat koordinasi grup Q1 yang akan dilaksanakan pada tanggal 15 Maret 2024 pukul 09:00 WIB di kantor pusat.", priority: "Tinggi", targetType: "all", targetValue: null, startDate: today, endDate: null, isPinned: true });
  await storage.createAnnouncement({ createdBy: sa.id, title: "Update Sistem SGCC", content: "Sistem SG Control Center telah diperbarui dengan fitur baru untuk monitoring kasus dan aktivitas. Silakan pelajari panduan penggunaan yang telah dibagikan.", priority: "Normal", targetType: "all", targetValue: null, startDate: today, endDate: null, isPinned: false });

  await storage.createNotification({ userId: du_sgb.id, type: "task_assigned", title: "Tugas Baru", message: "Anda mendapat tugas: Siapkan Laporan Bulanan Januari", entityType: "task", entityId: 1, priority: "high" });
  await storage.createNotification({ userId: dk_sgb.id, type: "task_assigned", title: "Tugas Baru", message: "Anda mendapat tugas: Tindak Lanjut Kasus SGB-2024-001", entityType: "task", entityId: 2, priority: "high" });
  await storage.createNotification({ userId: dk_kpf.id, type: "task_assigned", title: "Tugas Baru", message: "Anda mendapat tugas: Laporan Kepatuhan Triwulan", entityType: "task", entityId: 4, priority: "high" });

  console.log("Seed data selesai!");
}
