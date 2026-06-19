import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest, apiUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRoute, Link } from "wouter";
import { useState, type Dispatch, type SetStateAction } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, RiskBadge } from "@/components/status-badges";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, MessageSquare, Send, User, Clock, FileText, Trash2, CalendarDays, MapPin, Users, Paperclip, Download, X, Plus, Eye } from "lucide-react";
import { useLocation as useWouterLocation } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";
import type { Branch, Case, CaseUpdate, Comment, CaseMeeting } from "@shared/schema";

const WORKFLOW_STAGES = ["Pemeriksaan Internal", "Review", "Negosiasi", "Proses Regulator", "Settlement / Deadlock", "Closed"];
const normalizeWorkflowStage = (value?: string | null) => value && value !== "Open" ? value : "Pemeriksaan Internal";
const MEETING_TYPES = ["Mediasi Nasabah", "Musyawarah Pialang", "BBJ (Mediasi)", "Bappebti", "Negosiasi Internal", "Lainnya"];
const RESOLUTION_PATHS = ["Belum Ditentukan", "Pialang (Musyawarah)", "BBJ (Mediasi)", "Bappebti", "BAKTI", "Pengadilan", "Kepolisian"];
const LEGACY_MEETING_LABELS: Record<string, string> = {
  "Mediasi BBJ": "BBJ (Mediasi)",
  "Sidang Bappebti": "Bappebti",
};
const LEGACY_RESOLUTION_LABELS: Record<string, string> = {
  "Mediasi Internal": "Pialang (Musyawarah)",
  "Mediasi BBJ": "BBJ (Mediasi)",
  "Sidang Bappebti": "Bappebti",
};  
const normalizeMeetingType = (value?: string | null) =>
  value ? LEGACY_MEETING_LABELS[value] || value : "";
const normalizeResolutionPath = (value?: string | null) =>
  value ? LEGACY_RESOLUTION_LABELS[value] || value : "Belum Ditentukan";
type DocumentSection = {
  stage: string;
  fields: readonly string[];
  note: string;
  maxFiles?: number;
  subStages?: readonly string[];
};
const BAPPEBTI_PROCESSES = [
  "Perkembangan Pengaduan",
  "Klarifikasi Pengaduan",
  "Permintaan Dokumen",
  "Pemeriksaan Pengaduan",
  "Hasil Pemeriksaan Pengaduan",
  "Tindak Lanjut Pengaduan",
] as const;
const KEPOLISIAN_PROCESSES = [
  "Laporan Polisi",
  "BAP",
  "Perkembangan Laporan Polisi",
  "Hasil LP",
] as const;
const PENGADILAN_PROCESSES = [
  "Proses Persidangan",
  "Putusan Pengadilan",
] as const;
const BAKTI_PROCESSES = [
  "Proses Persidangan",
  "Putusan Bakti",
] as const;
const CUSTOMER_DOCUMENT_SECTIONS: readonly DocumentSection[] = [
  { stage: "Pertemuan Calon Nasabah", fields: ["multiDates"], note: "FKN, foto, screenshot, chat WA. Tanggal pertemuan bisa ditambahkan historis." },
  { stage: "Edukasi Pra Regol", fields: ["date"], note: "Screenshot video pra-regol." },
  { stage: "Simulasi Transaksi", fields: ["dateRange"], note: "Item screenshot demo transaksi." },
  { stage: "Registrasi Online", fields: ["date"], note: "Tanggal regol, foto atau screenshot." },
  { stage: "Verifikasi WPB", fields: ["date"], note: "Tanggal dan screenshot video verifikasi." },
  { stage: "Penyetoran Margin Awal", fields: ["date"], note: "Slip setoran dan OR. Maksimal 5 upload.", maxFiles: 5 },
  { stage: "Aktivasi Akun", fields: ["date", "approvalDates"], note: "Screenshot video aktivasi, tanggal approval Kacab dan Kepatuhan." },
  { stage: "Pengiriman Kode Akses Transaksi", fields: ["date"], note: "Bukti kirim via email dan SMS." },
  { stage: "Riwayat Transaksi", fields: ["dateRange"], note: "Trade history, daily statement, bukti kirim statement by email & SMS, bukti margin call." },
  { stage: "Topup dan WD", fields: ["notes"], note: "Isi berapa kali topup dan berapa kali WD." },
] as const;
const COMPLAINT_DOCUMENT_SECTIONS: readonly DocumentSection[] = [
  { stage: "Kronologi Pengaduan Nasabah", fields: [], note: "Upload file pendukung kronologi pengaduan nasabah." },
  { stage: "Pialang (Musyawarah)", fields: ["multiDates", "notes"], note: "Tanggal musyawarah historis dan hasil musyawarah." },
  { stage: "BBJ (Mediasi)", fields: ["multiDates", "notes"], note: "Klarifikasi dan tanggapan, serta undangan mediasi historis." },
  { stage: "Bappebti", fields: ["subStage", "date", "notes"], note: "Pilih proses Bappebti, isi tanggal/catatan, lalu upload dokumen terkait.", subStages: BAPPEBTI_PROCESSES },
  { stage: "Kepolisian", fields: ["subStage", "date", "notes"], note: "Pilih proses Kepolisian, isi tanggal/catatan, lalu upload dokumen terkait.", subStages: KEPOLISIAN_PROCESSES },
  { stage: "Pengadilan", fields: ["subStage", "date", "notes"], note: "Pilih proses Pengadilan, isi tanggal/catatan, lalu upload dokumen terkait.", subStages: PENGADILAN_PROCESSES },
  { stage: "BAKTI", fields: ["subStage", "date", "notes"], note: "Pilih proses BAKTI, isi tanggal/catatan, lalu upload dokumen terkait.", subStages: BAKTI_PROCESSES },
] as const;
const CASE_DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx";
const ALLOWED_CASE_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const MAX_CASE_DOCUMENT_SIZE = 20 * 1024 * 1024;
type CaseDocumentItem = {
  stage: string;
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  uploadedAt?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  meetingDates?: string[];
  subStage?: string;
  branchApprovalDate?: string;
  complianceApprovalDate?: string;
  notes?: string;
};
type DocumentMeta = Pick<CaseDocumentItem, "date" | "dateFrom" | "dateTo" | "meetingDates" | "subStage" | "branchApprovalDate" | "complianceApprovalDate" | "notes">;
function parseCaseDocuments(raw: unknown): CaseDocumentItem[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type RelatedAccountItem = {
  accountNumber: string;
  customerName: string;
  branch?: string;
  picMain?: string;
  branchHead?: string;
  wpbName?: string;
  managerName?: string;
  summary?: string;
  complaintChronology?: string;
  resolutionPath?: string;
  status?: string;
  riskLevel?: string;
  bucket?: string;
  workflowStage?: string;
  progress?: number;
  targetDate?: string;
  customerRequest?: string;
  companyOffer?: string;
  findings?: string;
  rootCause?: string;
  latestAction?: string;
  nextAction?: string;
};

function parseRelatedAccounts(value?: string | null, fallbackName = ""): RelatedAccountItem[] {
  const raw = (value || "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map(item => ({
          ...item,
          accountNumber: String(item?.accountNumber || "").trim(),
          customerName: String(item?.customerName || fallbackName).trim(),
        }))
        .filter(item => item.accountNumber)
        .filter((item, index, all) => all.findIndex(other => other.accountNumber.toLowerCase() === item.accountNumber.toLowerCase()) === index);
    }
  } catch {
    // Legacy text format below.
  }
  return raw
    .split(/[\n;]+/)
    .flatMap(line => line.split(","))
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const [accountNumber, customerName] = item.split("|").map(part => part.trim());
      return { accountNumber, customerName: customerName || fallbackName };
    })
    .filter(item => item.accountNumber)
    .filter((item, index, all) => all.findIndex(other => other.accountNumber.toLowerCase() === item.accountNumber.toLowerCase()) === index);
}

function serializeRelatedAccounts(accounts: RelatedAccountItem[]) {
  const cleaned = accounts
    .map(item => ({ ...item, accountNumber: item.accountNumber.trim(), customerName: item.customerName.trim() }))
    .filter(item => item.accountNumber)
    .map(item => Object.fromEntries(Object.entries(item).filter(([, value]) => value !== "" && value !== null && value !== undefined)));
  return JSON.stringify(cleaned);
}

function RelatedAccountsInput({
  value,
  onChange,
  primaryAccount,
  primaryCustomerName,
  branchNames = [],
  fullEdit = false,
}: {
  value: string;
  onChange: (value: string) => void;
  primaryAccount?: string | null;
  primaryCustomerName?: string | null;
  branchNames?: string[];
  fullEdit?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [hint, setHint] = useState("");
  const accounts = parseRelatedAccounts(value, primaryCustomerName || "");
  const addAccount = () => {
    const candidates = parseRelatedAccounts(draft, primaryCustomerName || "");
    if (candidates.length === 0) return;
    const primary = primaryAccount?.trim().toLowerCase();
    const nextAccounts = [...accounts];
    let added = 0;
    let skipped = 0;
    candidates.forEach(candidate => {
      const key = candidate.accountNumber.toLowerCase();
      const exists = nextAccounts.some(account => account.accountNumber.toLowerCase() === key) || (primary && primary === key);
      if (exists) {
        skipped += 1;
        return;
      }
      nextAccounts.push(candidate);
      added += 1;
    });
    if (added > 0) onChange(serializeRelatedAccounts(nextAccounts));
    setHint(skipped > 0 ? `${skipped} akun dilewati karena sudah ada/akun utama` : "");
    setDraft("");
  };
  const updateAccount = (index: number, patch: Partial<RelatedAccountItem>) => {
    const nextAccounts = accounts.map((account, idx) => idx === index ? { ...account, ...patch } : account);
    onChange(serializeRelatedAccounts(nextAccounts));
  };
  const removeAccount = (target: string) => {
    setHint("");
    onChange(serializeRelatedAccounts(accounts.filter(account => account.accountNumber !== target)));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          data-testid="input-edit-related-account-draft"
          placeholder="Masukkan nomor akun terkait"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              addAccount();
            }
          }}
          className="placeholder:text-muted-foreground/45"
        />
        <Button type="button" variant="outline" onClick={addAccount} data-testid="button-add-related-account">
          <Plus className="w-4 h-4" />
          Tambah
        </Button>
      </div>
      {hint && <p className="text-xs text-amber-600">{hint}</p>}
      {accounts.length > 0 && (
        <div className="space-y-2">
          {accounts.map((account, index) => (
            <div key={`${account.accountNumber}-${index}`} className="rounded-md border p-3 space-y-3" data-testid="row-edit-related-account">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input value={account.accountNumber} onChange={e => updateAccount(index, { accountNumber: e.target.value })} placeholder="No. akun" className="placeholder:text-muted-foreground/45" />
                <Input value={account.customerName} onChange={e => updateAccount(index, { customerName: e.target.value })} placeholder="Nama nasabah" className="placeholder:text-muted-foreground/45" />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeAccount(account.accountNumber)} aria-label={`Hapus ${account.accountNumber}`}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {fullEdit && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Select value={account.branch || undefined} onValueChange={v => updateAccount(index, { branch: v })}>
                      <SelectTrigger><SelectValue placeholder="Cabang" /></SelectTrigger>
                      <SelectContent>{branchNames.map(branch => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input value={account.picMain || ""} onChange={e => updateAccount(index, { picMain: e.target.value })} placeholder="Marketing" className="placeholder:text-muted-foreground/45" />
                    <Input value={account.branchHead || ""} onChange={e => updateAccount(index, { branchHead: e.target.value })} placeholder="Kepala Cabang" className="placeholder:text-muted-foreground/45" />
                    <Input value={account.wpbName || ""} onChange={e => updateAccount(index, { wpbName: e.target.value })} placeholder="WPB" className="placeholder:text-muted-foreground/45" />
                    <Input value={account.managerName || ""} onChange={e => updateAccount(index, { managerName: e.target.value })} placeholder="Manager" className="placeholder:text-muted-foreground/45" />
                    <Input type="date" value={account.targetDate || ""} onChange={e => updateAccount(index, { targetDate: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <Select value={account.status || undefined} onValueChange={v => updateAccount(index, { status: v })}>
                      <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>{["Open", "In Progress", "Closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={account.riskLevel || undefined} onValueChange={v => updateAccount(index, { riskLevel: v })}>
                      <SelectTrigger><SelectValue placeholder="Risk" /></SelectTrigger>
                      <SelectContent>{["Low", "Medium", "High"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={account.workflowStage || undefined} onValueChange={v => updateAccount(index, { workflowStage: v })}>
                      <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
                      <SelectContent>{WORKFLOW_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" min={0} max={100} value={account.progress ?? ""} onChange={e => updateAccount(index, { progress: e.target.value === "" ? undefined : Math.max(0, Math.min(100, Number(e.target.value))) })} placeholder="Progress" className="placeholder:text-muted-foreground/45" />
                  </div>
                  <Select value={account.bucket || undefined} onValueChange={v => updateAccount(index, { bucket: v })}>
                    <SelectTrigger><SelectValue placeholder="Bucket" /></SelectTrigger>
                    <SelectContent>{["Pemeriksaan Pengaduan Baru", "Disetujui untuk Perdamaian", "Tidak Disetujui untuk Perdamaian", "Menunggu Pemeriksaan", "Proses Negosiasi / Mediasi", "Proses Regulator", "Deadlock", "Closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={account.resolutionPath || undefined} onValueChange={v => updateAccount(index, { resolutionPath: v })}>
                    <SelectTrigger><SelectValue placeholder="Jalur Penyelesaian" /></SelectTrigger>
                    <SelectContent>{RESOLUTION_PATHS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                  <Textarea value={account.summary || ""} onChange={e => updateAccount(index, { summary: e.target.value })} placeholder="Inti pengaduan akun ini" className="placeholder:text-muted-foreground/45" />
                  <Textarea value={account.complaintChronology || ""} onChange={e => updateAccount(index, { complaintChronology: e.target.value })} placeholder="Kronologi pengaduan akun ini" className="placeholder:text-muted-foreground/45" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Textarea value={account.customerRequest || ""} onChange={e => updateAccount(index, { customerRequest: e.target.value })} placeholder="Permintaan nasabah" className="placeholder:text-muted-foreground/45" />
                    <Textarea value={account.companyOffer || ""} onChange={e => updateAccount(index, { companyOffer: e.target.value })} placeholder="Penawaran perusahaan" className="placeholder:text-muted-foreground/45" />
                    <Textarea value={account.findings || ""} onChange={e => updateAccount(index, { findings: e.target.value })} placeholder="Temuan" className="placeholder:text-muted-foreground/45" />
                    <Textarea value={account.rootCause || ""} onChange={e => updateAccount(index, { rootCause: e.target.value })} placeholder="Root cause" className="placeholder:text-muted-foreground/45" />
                    <Textarea value={account.latestAction || ""} onChange={e => updateAccount(index, { latestAction: e.target.value })} placeholder="Tindakan terakhir" className="placeholder:text-muted-foreground/45" />
                    <Textarea value={account.nextAction || ""} onChange={e => updateAccount(index, { nextAction: e.target.value })} placeholder="Tindak lanjut" className="placeholder:text-muted-foreground/45" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function KasusDetailPage() {
  const [, params] = useRoute("/kasus/:id");
  const id = parseInt(params?.id || "0");
  const { user } = useAuth();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [updateContent, setUpdateContent] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newStage, setNewStage] = useState("");
  const [newProgress, setNewProgress] = useState<number | undefined>(undefined);
  const [selectedRelatedAccount, setSelectedRelatedAccount] = useState("");
  const [editAccountKey, setEditAccountKey] = useState("__main__");
  const [editing, setEditing] = useState(false);
  const [caseDocumentsEdit, setCaseDocumentsEdit] = useState<CaseDocumentItem[]>([]);
  const [complaintAttachmentsEdit, setComplaintAttachmentsEdit] = useState<CaseDocumentItem[]>([]);
  const [caseDocumentMeta, setCaseDocumentMeta] = useState<Record<string, DocumentMeta>>({});
  const [complaintDocumentMeta, setComplaintDocumentMeta] = useState<Record<string, DocumentMeta>>({});

  const [meetingForm, setMeetingForm] = useState({
    meetingDate: "",
    meetingType: "",
    participants: "",
    location: "",
    result: "",
    notes: "",
  });

  const { data: caseData, isLoading } = useQuery<Case>({ queryKey: ["/api/cases", id] });
  usePageTitle(caseData?.caseCode ? `${caseData.caseCode} - Kasus` : "Detail Kasus");
  const { data: caseUpdates } = useQuery<CaseUpdate[]>({ queryKey: ["/api/cases", id, "updates"] });
  const { data: commentsData } = useQuery<Comment[]>({ queryKey: ["/api/comments", "case", id] });
  const { data: meetingsData } = useQuery<CaseMeeting[]>({ queryKey: ["/api/cases", id, "meetings"] });
  const { data: usersData } = useQuery<any[]>({ queryKey: ["/api/users"] });
  const { data: companiesData } = useQuery<any[]>({ queryKey: ["/api/companies"] });
  const isDuDk = ["du", "dk", "cbo", "ceo", "kepatuhan_cabang", "apuppt"].includes(user?.role || "");
  const isAdmin = ["superadmin", "owner"].includes(user?.role || "");
  const { data: myBranches } = useQuery<Branch[]>({
    queryKey: ["/api/branches/my-company"],
    enabled: isDuDk,
  });
  const { data: caseCompanyBranches } = useQuery<Branch[]>({
    queryKey: ["/api/companies", caseData?.companyId, "branches"],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/companies/${caseData?.companyId}/branches`), { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAdmin && !!caseData?.companyId,
  });
  const branchOptions = (isDuDk ? myBranches : caseCompanyBranches) || [];

  const [editForm, setEditForm] = useState<Partial<Case>>({});
  const branchNames = editForm.branch && !branchOptions.some(branch => branch.name === editForm.branch)
    ? [...branchOptions.map(branch => branch.name), editForm.branch]
    : branchOptions.map(branch => branch.name);
  const compactValue = (value: unknown) => {
    if (value === null || value === undefined || value === "") return "-";
    const text = String(value).replace(/\s+/g, " ").trim();
    return text.length > 90 ? `${text.slice(0, 87)}...` : text;
  };
  const summarizeRelatedAccountsForTimeline = (value: string) => {
    const afterValue = value.includes("->") ? value.split("->").pop() || value : value;
    const accounts = parseRelatedAccounts(afterValue, caseData?.customerName || "");
    if (accounts.length === 0) return compactValue(afterValue);
    return accounts
      .map(account => `  - ${account.accountNumber}${account.customerName ? ` | Nasabah: ${account.customerName}` : ""}`)
      .join("\n");
  };
  const formatTimelineContent = (content: string) => {
    const lines = (content || "").split("\n");
    const formatted: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === "Update data kasus:") {
        formatted.push("Perubahan data kasus:");
        continue;
      }
      if (trimmed.startsWith("- Akun Terkait:") || trimmed.startsWith("Akun Terkait:")) {
        const rawValue = trimmed.replace(/^-?\s*Akun Terkait:\s*/, "");
        formatted.push(`Daftar akun terkait diperbarui:\n${summarizeRelatedAccountsForTimeline(rawValue)}`);
        continue;
      }
      if (trimmed.startsWith("Update data akun terkait ")) {
        const raw = trimmed.replace("Update data akun terkait ", "").trim();
        const [accountNumber, customerName] = raw.split(":").map(part => part.trim());
        formatted.push(`Perubahan akun terkait:\n  - Akun: ${accountNumber}${customerName ? ` | Nasabah: ${customerName}` : ""}`);
        continue;
      }
      if (trimmed.startsWith("- ")) {
        const withoutBullet = trimmed.slice(2);
        const [label, ...rest] = withoutBullet.split(":");
        const detail = rest.join(":").trim();
        formatted.push(`  - ${label.trim()}: ${detail}`);
        continue;
      }
      formatted.push(line);
    }

    return formatted.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  };
  const documentSummary = (docs: CaseDocumentItem[]) =>
    docs.length ? `${docs.length} file: ${docs.map((doc) => doc.fileName).join(", ")}` : "0 file";
  const documentMetaSummary = (doc: CaseDocumentItem) => [
    doc.subStage ? `Proses: ${doc.subStage}` : "",
    doc.meetingDates?.length ? `Tanggal: ${doc.meetingDates.join(", ")}` : "",
    doc.date ? `Tanggal: ${doc.date}` : "",
    doc.dateFrom || doc.dateTo ? `Rentang: ${doc.dateFrom || "-"} s.d ${doc.dateTo || "-"}` : "",
    doc.branchApprovalDate ? `Approval Kacab: ${doc.branchApprovalDate}` : "",
    doc.complianceApprovalDate ? `Approval Kepatuhan: ${doc.complianceApprovalDate}` : "",
    doc.notes ? `Catatan: ${compactValue(doc.notes)}` : "",
  ].filter(Boolean).join("; ");
  const DocumentFileActions = ({ doc, onRemove }: { doc: CaseDocumentItem; onRemove: () => void }) => (
    <div className="flex items-center gap-1 shrink-0">
      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(doc.dataUrl, "_blank", "noopener,noreferrer")}>
        <Eye className="w-3.5 h-3.5" />
      </Button>
      <a href={doc.dataUrl} download={doc.fileName} className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted" title="Download">
        <Download className="w-3.5 h-3.5" />
      </a>
      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
  const getDocumentTimelineLogs = (stage: string) => (caseUpdates || [])
    .filter((update) => {
      const content = update.content || "";
      return content.includes(` / ${stage}:`) || content.includes(`(${stage})`) || content.includes(`(${stage} -`);
    })
    .slice(0, 5);
  const buildDocumentMetaTimelineNote = () => {
    const lines: string[] = [];
    const collect = (title: string, sections: readonly DocumentSection[], meta: Record<string, DocumentMeta>) => {
      sections.forEach((section) => {
        const current = meta[section.stage];
        if (!current) return;
        const details: string[] = [];
        const meetingDates = (current.meetingDates || []).filter(Boolean);
        if (meetingDates.length > 0) details.push(`Tanggal: ${meetingDates.join(", ")}`);
        if (current.subStage) details.push(`Proses: ${current.subStage}`);
        if (current.date) details.push(`Tanggal: ${current.date}`);
        if (current.dateFrom || current.dateTo) details.push(`Rentang: ${current.dateFrom || "-"} s.d ${current.dateTo || "-"}`);
        if (current.branchApprovalDate) details.push(`Approval Kacab: ${current.branchApprovalDate}`);
        if (current.complianceApprovalDate) details.push(`Approval Kepatuhan: ${current.complianceApprovalDate}`);
        if (current.notes?.trim()) details.push(`Catatan: ${compactValue(current.notes)}`);
        if (details.length > 0) lines.push(`- ${title} / ${section.stage}: ${details.join("; ")}`);
      });
    };
    collect("Dokumen Pengaduan Nasabah", COMPLAINT_DOCUMENT_SECTIONS, complaintDocumentMeta);
    collect("Dokumen Nasabah", CUSTOMER_DOCUMENT_SECTIONS, caseDocumentMeta);
    return lines.length > 0 ? `Update metadata dokumen:\n${lines.join("\n")}` : "";
  };
  const buildCaseChangeHistory = (data: any) => {
    if (!caseData) return "";
    const fieldLabels: Array<[keyof Case, string]> = [
      ["customerName", "Nama Nasabah"],
      ["accountNumber", "No. Akun"],
      ["relatedAccounts", "Akun Terkait"],
      ["branch", "Cabang"],
      ["picMain", "Marketing"],
      ["branchHead", "Kepala Cabang"],
      ["wpbName", "WPB"],
      ["managerName", "Manager"],
      ["resolutionPath", "Jalur Penyelesaian"],
      ["summary", "Inti Pengaduan"],
      ["complaintChronology", "Kronologi Pengaduan Nasabah"],
      ["status", "Status"],
      ["riskLevel", "Risk Level"],
      ["bucket", "Bucket"],
      ["workflowStage", "Workflow Stage"],
      ["progress", "Progress"],
      ["targetDate", "Target Penyelesaian"],
      ["customerRequest", "Permintaan Nasabah"],
      ["companyOffer", "Penawaran Perusahaan"],
      ["findings", "Temuan"],
      ["rootCause", "Root Cause"],
      ["latestAction", "Tindakan Terakhir"],
      ["nextAction", "Tindak Lanjut"],
    ];
    const changes = fieldLabels.flatMap(([key, label]) => {
      const before = key === "workflowStage" ? normalizeWorkflowStage(caseData[key] as string) : key === "resolutionPath" ? normalizeResolutionPath(caseData[key] as string) : caseData[key];
      const after = data[key];
      if (String(before ?? "") === String(after ?? "")) return [];
      const suffix = key === "progress" ? "%" : "";
      return [`${label}: ${compactValue(before)}${suffix} -> ${compactValue(after)}${suffix}`];
    });
    const oldComplaintDocs = parseCaseDocuments(caseData.complaintAttachments);
    if (documentSummary(oldComplaintDocs) !== documentSummary(data.complaintAttachments || [])) {
      changes.push(`Dokumen Pengaduan Nasabah: ${documentSummary(oldComplaintDocs)} -> ${documentSummary(data.complaintAttachments || [])}`);
    }
    const oldCaseDocs = parseCaseDocuments(caseData.caseDocuments);
    if (documentSummary(oldCaseDocs) !== documentSummary(data.caseDocuments || [])) {
      changes.push(`Dokumen Nasabah: ${documentSummary(oldCaseDocs)} -> ${documentSummary(data.caseDocuments || [])}`);
    }
    return changes.length ? `Update data kasus:\n${changes.map((change) => `- ${change}`).join("\n")}` : "";
  };

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/cases/${id}`, data);
      const updated = await res.json();
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id, "updates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Berhasil", description: "Update kasus tersimpan ke timeline" });
      setEditing(false);
    },
  });

  const caseUpdateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/cases/${id}/updates`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id, "updates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setUpdateContent("");
      setNewStatus("");
      setNewStage("");
      setNewProgress(undefined);
      toast({ title: "Berhasil", description: "Update ditambahkan" });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/comments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments", "case", id] });
      setCommentText("");
    },
  });

  const meetingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/cases/${id}/meetings`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id, "meetings"] });
      setMeetingForm({ meetingDate: "", meetingType: "", participants: "", location: "", result: "", notes: "" });
      toast({ title: "Berhasil", description: "Pertemuan ditambahkan" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal menambahkan pertemuan", variant: "destructive" });
    },
  });

  const deleteMeetingMutation = useMutation({
    mutationFn: async (meetingId: number) => {
      await apiRequest("DELETE", `/api/meetings/${meetingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id, "meetings"] });
      toast({ title: "Berhasil", description: "Pertemuan dihapus" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal menghapus", variant: "destructive" });
    },
  });

  const getUserName = (userId: number) => usersData?.find((u: any) => u.id === userId)?.fullName || "Unknown";
  const getCompanyName = (companyId: number) => companiesData?.find((c: any) => c.id === companyId)?.name || "-";

  const [, setLocation] = useWouterLocation();
  const canEdit = ["superadmin", "du", "dk", "kepatuhan_cabang", "apuppt"].includes(user?.role || "") || (["cbo", "ceo"].includes(user?.role || "") && caseData?.createdBy === user?.id);
  const canUpdate = ["superadmin", "du", "dk", "cbo", "ceo", "kepatuhan_cabang", "apuppt"].includes(user?.role || "");
  const canDelete = ["superadmin", "owner", "du", "dk", "apuppt"].includes(user?.role || "") || caseData?.createdBy === user?.id;
  const canDeleteMeeting = (createdBy: number) => user?.role === "superadmin" || createdBy === user?.id;

  const deleteMutation = useMutation({
    mutationFn: async () => { await apiRequest("DELETE", `/api/cases/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Berhasil", description: "Kasus berhasil dihapus" });
      setLocation("/kasus");
    },
    onError: (err: any) => { toast({ title: "Gagal", description: err.message || "Gagal menghapus", variant: "destructive" }); },
  });

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;
  if (!caseData) return <div className="p-6"><p className="text-muted-foreground">Kasus tidak ditemukan</p></div>;

  const relatedAccountOptions = parseRelatedAccounts(caseData.relatedAccounts, caseData.customerName)
    .filter(account => account.accountNumber.toLowerCase() !== (caseData.accountNumber || "").toLowerCase());
  const selectedRelatedAccountItem = relatedAccountOptions.find(account => account.accountNumber === selectedRelatedAccount);
  const accountField = <K extends keyof RelatedAccountItem>(key: K, fallback: unknown = "-") => {
    const value = selectedRelatedAccountItem?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
    if (fallback !== undefined && fallback !== null && fallback !== "") return fallback;
    return "-";
  };

  const setMainAccountEditForm = () => {
    setEditForm({
      customerName: caseData.customerName,
      accountNumber: caseData.accountNumber,
      relatedAccounts: caseData.relatedAccounts,
      branch: caseData.branch,
      picMain: caseData.picMain,
      branchHead: caseData.branchHead,
      wpbName: caseData.wpbName,
      managerName: caseData.managerName,
      summary: caseData.summary,
      complaintChronology: caseData.complaintChronology,
      workflowStage: normalizeWorkflowStage(caseData.workflowStage),
      progress: caseData.progress,
      targetDate: caseData.targetDate,
      customerRequest: caseData.customerRequest,
      companyOffer: caseData.companyOffer,
      status: caseData.status,
      riskLevel: caseData.riskLevel,
      bucket: caseData.bucket,
      findings: caseData.findings,
      rootCause: caseData.rootCause,
      latestAction: caseData.latestAction,
      nextAction: caseData.nextAction,
      resolutionPath: normalizeResolutionPath(caseData.resolutionPath),
    });
  };

  const setRelatedAccountEditForm = (account: RelatedAccountItem) => {
    setEditForm({
      customerName: account.customerName || caseData.customerName,
      accountNumber: account.accountNumber,
      relatedAccounts: caseData.relatedAccounts,
      branch: account.branch || caseData.branch,
      picMain: account.picMain || caseData.picMain,
      branchHead: account.branchHead || caseData.branchHead,
      wpbName: account.wpbName || caseData.wpbName,
      managerName: account.managerName || caseData.managerName,
      summary: account.summary || caseData.summary,
      complaintChronology: account.complaintChronology || caseData.complaintChronology,
      workflowStage: normalizeWorkflowStage(account.workflowStage || caseData.workflowStage),
      progress: account.progress ?? caseData.progress,
      targetDate: account.targetDate || caseData.targetDate,
      customerRequest: account.customerRequest || caseData.customerRequest,
      companyOffer: account.companyOffer || caseData.companyOffer,
      status: account.status || caseData.status,
      riskLevel: account.riskLevel || caseData.riskLevel,
      bucket: account.bucket || caseData.bucket,
      findings: account.findings || caseData.findings,
      rootCause: account.rootCause || caseData.rootCause,
      latestAction: account.latestAction || caseData.latestAction,
      nextAction: account.nextAction || caseData.nextAction,
      resolutionPath: normalizeResolutionPath(account.resolutionPath || caseData.resolutionPath),
    });
  };

  const startEdit = () => {
    setEditAccountKey("__main__");
    setMainAccountEditForm();
    setCaseDocumentsEdit(parseCaseDocuments(caseData.caseDocuments));
    setComplaintAttachmentsEdit(parseCaseDocuments(caseData.complaintAttachments));
    setEditing(true);
  };

  const handleEditAccountChange = (value: string) => {
    setEditAccountKey(value);
    if (value === "__main__") {
      setMainAccountEditForm();
      return;
    }
    const account = relatedAccountOptions.find(item => item.accountNumber === value);
    if (account) setRelatedAccountEditForm(account);
  };

  const buildRelatedAccountFromEditForm = (base: RelatedAccountItem): RelatedAccountItem => ({
    ...base,
    accountNumber: String(editForm.accountNumber || "").trim(),
    customerName: String(editForm.customerName || caseData.customerName || "").trim(),
    branch: editForm.branch || undefined,
    picMain: editForm.picMain || undefined,
    branchHead: editForm.branchHead || undefined,
    wpbName: editForm.wpbName || undefined,
    managerName: editForm.managerName || undefined,
    summary: editForm.summary || undefined,
    complaintChronology: editForm.complaintChronology || undefined,
    resolutionPath: editForm.resolutionPath || undefined,
    status: editForm.status || undefined,
    riskLevel: editForm.riskLevel || undefined,
    bucket: editForm.bucket || undefined,
    workflowStage: editForm.workflowStage || undefined,
    progress: typeof editForm.progress === "number" ? editForm.progress : undefined,
    targetDate: editForm.targetDate || undefined,
    customerRequest: editForm.customerRequest || undefined,
    companyOffer: editForm.companyOffer || undefined,
    findings: editForm.findings || undefined,
    rootCause: editForm.rootCause || undefined,
    latestAction: editForm.latestAction || undefined,
    nextAction: editForm.nextAction || undefined,
  });

  const handleSaveEdit = () => {
    if (editAccountKey === "__main__") {
      updateMutation.mutate({ ...editForm, complaintAttachments: complaintAttachmentsEdit, caseDocuments: caseDocumentsEdit, timelineNote: buildDocumentMetaTimelineNote() || null });
      return;
    }
    const relatedAccounts = parseRelatedAccounts(caseData.relatedAccounts, caseData.customerName);
    const updatedRelatedAccounts = relatedAccounts.map(account =>
      account.accountNumber === editAccountKey ? buildRelatedAccountFromEditForm(account) : account
    );
    updateMutation.mutate({
      relatedAccounts: serializeRelatedAccounts(updatedRelatedAccounts),
      timelineNote: `Update data akun terkait ${editAccountKey}: ${String(editForm.customerName || caseData.customerName || "-")}`,
    });
  };

  const meetingCountByType = (meetingsData || []).reduce((acc: Record<string, number>, m) => {
    const meetingType = normalizeMeetingType(m.meetingType);
    acc[meetingType] = (acc[meetingType] || 0) + 1;
    return acc;
  }, {});

  const meetingCountSummary = Object.entries(meetingCountByType)
    .map(([type, count]) => `${type}: ${count}x`)
    .join(", ");
  const caseDocuments: CaseDocumentItem[] = (() => {
    if (!caseData.caseDocuments) return [];
    try {
      const parsed = JSON.parse(caseData.caseDocuments);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  const complaintAttachments: CaseDocumentItem[] = (() => {
    if (!caseData.complaintAttachments) return [];
    try {
      const parsed = JSON.parse(caseData.complaintAttachments);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const handleCaseDocumentUploadEdit = async (stage: string, files: FileList | null, meta: DocumentMeta = {}) => {
    if (!files || files.length === 0) return;
    const pending = Array.from(files);
    const invalid = pending.find(f => !ALLOWED_CASE_DOCUMENT_MIME_TYPES.has(f.type));
    if (invalid) {
      toast({ title: "Format tidak didukung", description: `${invalid.name} tidak didukung`, variant: "destructive" });
      return;
    }
    const oversize = pending.find(f => f.size > MAX_CASE_DOCUMENT_SIZE);
    if (oversize) {
      toast({ title: "Ukuran terlalu besar", description: `${oversize.name} melebihi 20MB`, variant: "destructive" });
      return;
    }
    try {
      const encoded = await Promise.all(pending.map(async (file) => ({
        stage,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        dataUrl: await fileToDataUrl(file),
        uploadedAt: new Date().toISOString(),
      })));
      setCaseDocumentsEdit(prev => [...prev, ...encoded]);
      toast({ title: "Berhasil", description: `${encoded.length} dokumen ditambahkan` });
    } catch {
      toast({ title: "Gagal", description: "Gagal membaca dokumen", variant: "destructive" });
    }
  };
  const removeCaseDocumentEdit = (index: number) => {
    setCaseDocumentsEdit(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplaintAttachmentUploadEdit = async (stage: string, files: FileList | null, meta: DocumentMeta = {}) => {
    if (!files || files.length === 0) return;
    const pending = Array.from(files);
    const invalid = pending.find(f => !ALLOWED_CASE_DOCUMENT_MIME_TYPES.has(f.type));
    if (invalid) {
      toast({ title: "Format tidak didukung", description: `${invalid.name} tidak didukung`, variant: "destructive" });
      return;
    }
    const oversize = pending.find(f => f.size > MAX_CASE_DOCUMENT_SIZE);
    if (oversize) {
      toast({ title: "Ukuran terlalu besar", description: `${oversize.name} melebihi 20MB`, variant: "destructive" });
      return;
    }

    try {
      const encoded = await Promise.all(pending.map(async (file) => ({
        stage,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        dataUrl: await fileToDataUrl(file),
        uploadedAt: new Date().toISOString(),
        ...meta,
      })));
      setComplaintAttachmentsEdit(prev => [...prev, ...encoded]);
      toast({ title: "Berhasil", description: `${encoded.length} lampiran ditambahkan` });
    } catch {
      toast({ title: "Gagal", description: "Gagal membaca lampiran", variant: "destructive" });
    }
  };

  const removeComplaintAttachmentEdit = (index: number) => {
    setComplaintAttachmentsEdit(prev => prev.filter((_, i) => i !== index));
  };
  const updateDocumentMeta = (
    setter: Dispatch<SetStateAction<Record<string, DocumentMeta>>>,
    stage: string,
    key: keyof DocumentMeta,
    value: string,
  ) => setter(prev => ({ ...prev, [stage]: { ...(prev[stage] || {}), [key]: value } }));
  const addDocumentMeetingDate = (
    setter: Dispatch<SetStateAction<Record<string, DocumentMeta>>>,
    stage: string,
  ) => setter(prev => {
    const current = prev[stage] || {};
    return { ...prev, [stage]: { ...current, meetingDates: [...(current.meetingDates || []), ""] } };
  });
  const updateDocumentMeetingDate = (
    setter: Dispatch<SetStateAction<Record<string, DocumentMeta>>>,
    stage: string,
    index: number,
    value: string,
  ) => setter(prev => {
    const current = prev[stage] || {};
    const nextDates = [...(current.meetingDates || [])];
    nextDates[index] = value;
    return { ...prev, [stage]: { ...current, meetingDates: nextDates } };
  });
  const removeDocumentMeetingDate = (
    setter: Dispatch<SetStateAction<Record<string, DocumentMeta>>>,
    stage: string,
    index: number,
  ) => setter(prev => {
    const current = prev[stage] || {};
    return { ...prev, [stage]: { ...current, meetingDates: (current.meetingDates || []).filter((_, i) => i !== index) } };
  });
  const renderDocumentMetaFields = (
    section: DocumentSection,
    meta: Record<string, DocumentMeta>,
    setter: Dispatch<SetStateAction<Record<string, DocumentMeta>>>,
  ) => {
    if (section.fields.length === 0) return null;
    const current = meta[section.stage] || {};
    const meetingDates = current.meetingDates?.length ? current.meetingDates : [""];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {section.fields.includes("subStage") && section.subStages && <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Proses {section.stage}</Label>
          <Select value={current.subStage || ""} onValueChange={v => updateDocumentMeta(setter, section.stage, "subStage", v)}>
            <SelectTrigger><SelectValue placeholder={`Pilih proses ${section.stage}`} /></SelectTrigger>
            <SelectContent>{section.subStages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>}
        {section.fields.includes("date") && <div className="space-y-1"><Label className="text-xs">Tanggal</Label><Input type="date" value={current.date || ""} onChange={e => updateDocumentMeta(setter, section.stage, "date", e.target.value)} /></div>}
        {section.fields.includes("dateRange") && <>
          <div className="space-y-1"><Label className="text-xs">Dari Tanggal</Label><Input type="date" value={current.dateFrom || ""} onChange={e => updateDocumentMeta(setter, section.stage, "dateFrom", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Sampai Tanggal</Label><Input type="date" value={current.dateTo || ""} onChange={e => updateDocumentMeta(setter, section.stage, "dateTo", e.target.value)} /></div>
        </>}
        {section.fields.includes("multiDates") && <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs">Tanggal</Label>
            <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => addDocumentMeetingDate(setter, section.stage)}><Plus className="h-3.5 w-3.5" /></Button>
          </div>
          {meetingDates.map((date, index) => (
            <div key={`${section.stage}-meeting-date-${index}`} className="flex items-center gap-2">
              <Input type="date" value={date} onChange={e => updateDocumentMeetingDate(setter, section.stage, index, e.target.value)} />
              {meetingDates.length > 1 && <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => removeDocumentMeetingDate(setter, section.stage, index)}><X className="h-3.5 w-3.5" /></Button>}
            </div>
          ))}
        </div>}
        {section.fields.includes("approvalDates") && <>
          <div className="space-y-1"><Label className="text-xs">Approval Kacab</Label><Input type="date" value={current.branchApprovalDate || ""} onChange={e => updateDocumentMeta(setter, section.stage, "branchApprovalDate", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Approval Kepatuhan</Label><Input type="date" value={current.complianceApprovalDate || ""} onChange={e => updateDocumentMeta(setter, section.stage, "complianceApprovalDate", e.target.value)} /></div>
        </>}
        {section.fields.includes("notes") && <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Catatan</Label><Textarea value={current.notes || ""} onChange={e => updateDocumentMeta(setter, section.stage, "notes", e.target.value)} /></div>}
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/kasus"><Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold" data-testid="text-case-code">{caseData.caseCode}</h1>
            <RiskBadge level={caseData.riskLevel} />
            <StatusBadge status={caseData.status} />
          </div>
          <p className="text-sm text-muted-foreground">{caseData.customerName} - {getCompanyName(caseData.companyId)}</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && !editing && <Button size="sm" onClick={startEdit} data-testid="button-edit-case">Update</Button>}
          {canDelete && !editing && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" data-testid="button-delete-case"><Trash2 className="w-4 h-4 mr-1" /> Hapus</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Kasus?</AlertDialogTitle>
                  <AlertDialogDescription>Kasus "{caseData.caseCode} - {caseData.customerName}" akan dihapus. Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {editing ? (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Data yang diedit</Label>
              <Select value={editAccountKey} onValueChange={handleEditAccountChange}>
                <SelectTrigger data-testid="select-edit-account">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__main__">{caseData.accountNumber || "Akun Utama"} - Akun Utama</SelectItem>
                  {relatedAccountOptions.map(account => (
                    <SelectItem key={account.accountNumber} value={account.accountNumber}>
                      {account.accountNumber}{account.customerName ? ` - ${account.customerName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nama Nasabah</Label>
                <Input data-testid="input-edit-customer-name" value={editForm.customerName || ""} onChange={e => setEditForm({...editForm, customerName: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>No. Akun</Label>
                <Input data-testid="input-edit-account-number" value={editForm.accountNumber || ""} onChange={e => setEditForm({...editForm, accountNumber: e.target.value})} />
              </div>
            </div>
            {editAccountKey === "__main__" && (
              <div className="space-y-1.5">
                <Label>Akun Terkait</Label>
                <RelatedAccountsInput
                  value={editForm.relatedAccounts || ""}
                  primaryAccount={editForm.accountNumber}
                  primaryCustomerName={editForm.customerName}
                  onChange={relatedAccounts => setEditForm(prev => ({...prev, relatedAccounts}))}
                />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cabang</Label>
                <Select value={editForm.branch || undefined} onValueChange={v => setEditForm({...editForm, branch: v})}>
                  <SelectTrigger data-testid="select-edit-branch">
                    <SelectValue placeholder={branchOptions.length ? "Pilih cabang" : "Belum ada cabang"} />
                  </SelectTrigger>
                  <SelectContent>
                    {branchNames.map(branch => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>PIC Utama / Marketing</Label>
                <Input data-testid="input-edit-pic-main" value={editForm.picMain || ""} onChange={e => setEditForm({...editForm, picMain: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>WPB</Label>
                <Input data-testid="input-edit-wpb" value={editForm.wpbName || ""} onChange={e => setEditForm({...editForm, wpbName: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Manager</Label>
                <Input data-testid="input-edit-manager" value={editForm.managerName || ""} onChange={e => setEditForm({...editForm, managerName: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Kepala Cabang</Label>
                <Input data-testid="input-edit-branch-head" value={editForm.branchHead || ""} onChange={e => setEditForm({...editForm, branchHead: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Jalur Penyelesaian</Label>
              <Select value={normalizeResolutionPath(editForm.resolutionPath)} onValueChange={v => setEditForm({...editForm, resolutionPath: v})}>
                <SelectTrigger data-testid="select-edit-resolution"><SelectValue /></SelectTrigger>
                <SelectContent>{RESOLUTION_PATHS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Inti Pengaduan / Summary</Label>
              <Textarea data-testid="input-edit-summary" value={editForm.summary || ""} onChange={e => setEditForm({...editForm, summary: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label>Kronologi Pengaduan Nasabah</Label>
              <Textarea
                data-testid="input-edit-complaint-chronology"
                value={editForm.complaintChronology || ""}
                onChange={e => setEditForm({...editForm, complaintChronology: e.target.value})}
              />
            </div>
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <Label className="font-medium">Dokumen Pengaduan Nasabah</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Format: PDF, JPG/JPEG, PNG, DOC/DOCX, XLS/XLSX. Maks 20MB per file.
              </p>
              <div className="space-y-3">
                {COMPLAINT_DOCUMENT_SECTIONS.map((section) => {
                  const currentMeta = complaintDocumentMeta[section.stage] || {};
                  const uploadStage = currentMeta.subStage ? `${section.stage} - ${currentMeta.subStage}` : section.stage;
                  const docs = complaintAttachmentsEdit.map((doc, idx) => ({ ...doc, idx })).filter((doc) => doc.stage === section.stage || doc.stage.startsWith(`${section.stage} - `));
                  const logs = getDocumentTimelineLogs(section.stage);
                  return (
                    <div key={`detail-complaint-${section.stage}`} className="rounded-md border p-2 space-y-2">
                      <p className="text-sm font-medium">{section.stage}</p>
                      <p className="text-xs text-muted-foreground">{section.note}</p>
                      {renderDocumentMetaFields(section, complaintDocumentMeta, setComplaintDocumentMeta)}
                      <Input type="file" multiple accept={CASE_DOCUMENT_ACCEPT} onChange={async (e) => {
                        const input = e.currentTarget;
                        await handleComplaintAttachmentUploadEdit(uploadStage, input.files, currentMeta);
                        input.value = "";
                      }} />
                      {docs.map((doc) => (
                        <div key={`detail-complaint-${doc.fileName}-${doc.idx}`} className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{doc.fileName}</p>
                            <p className="truncate text-muted-foreground">{doc.stage}</p>
                            {documentMetaSummary(doc) && <p className="text-muted-foreground">{documentMetaSummary(doc)}</p>}
                          </div>
                          <DocumentFileActions doc={doc} onRemove={() => removeComplaintAttachmentEdit(doc.idx)} />
                        </div>
                      ))}
                      {logs.length > 0 && (
                        <div className="rounded-md bg-muted/40 p-2 text-xs space-y-1">
                          <p className="font-medium">Log tersimpan</p>
                          {logs.map((log) => (
                            <p key={log.id} className="whitespace-pre-wrap text-muted-foreground">{log.content}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editForm.status || ""} onValueChange={v => setEditForm({...editForm, status: v})}>
                  <SelectTrigger data-testid="select-edit-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Open", "In Progress", "Closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Risk Level</Label>
                <Select value={editForm.riskLevel || ""} onValueChange={v => setEditForm({...editForm, riskLevel: v})}>
                  <SelectTrigger data-testid="select-edit-risk"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Low","Medium","High"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bucket</Label>
                <Select value={editForm.bucket || ""} onValueChange={v => setEditForm({...editForm, bucket: v})}>
                  <SelectTrigger data-testid="select-edit-bucket"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Pemeriksaan Pengaduan Baru","Disetujui untuk Perdamaian","Tidak Disetujui untuk Perdamaian","Menunggu Pemeriksaan","Proses Negosiasi / Mediasi","Proses Regulator","Deadlock","Closed"].map(b =>
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Workflow Stage</Label>
                <Select value={editForm.workflowStage || ""} onValueChange={v => setEditForm({...editForm, workflowStage: v})}>
                  <SelectTrigger data-testid="select-edit-stage"><SelectValue /></SelectTrigger>
                  <SelectContent>{WORKFLOW_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Progress (%)</Label>
                <Input data-testid="input-edit-progress" type="number" min={0} max={100} value={editForm.progress ?? 0} onChange={e => setEditForm({...editForm, progress: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-1.5">
                <Label>Target Penyelesaian</Label>
                <Input data-testid="input-edit-target-date" type="date" value={editForm.targetDate || ""} onChange={e => setEditForm({...editForm, targetDate: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Permintaan Nasabah</Label>
                <Textarea data-testid="input-edit-customer-request" value={editForm.customerRequest || ""} onChange={e => setEditForm({...editForm, customerRequest: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Penawaran Perusahaan</Label>
                <Textarea data-testid="input-edit-company-offer" value={editForm.companyOffer || ""} onChange={e => setEditForm({...editForm, companyOffer: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Temuan</Label>
              <Textarea data-testid="input-edit-findings" value={editForm.findings || ""} onChange={e => setEditForm({...editForm, findings: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label>Root Cause</Label>
              <Textarea data-testid="input-edit-root-cause" value={editForm.rootCause || ""} onChange={e => setEditForm({...editForm, rootCause: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tindakan Terakhir</Label>
                <Textarea data-testid="input-edit-latest-action" value={editForm.latestAction || ""} onChange={e => setEditForm({...editForm, latestAction: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Tindak Lanjut</Label>
                <Textarea data-testid="input-edit-next-action" value={editForm.nextAction || ""} onChange={e => setEditForm({...editForm, nextAction: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <Label className="font-medium">Dokumen Nasabah</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Format: PDF, JPG/JPEG, PNG, DOC/DOCX, XLS/XLSX. Maks 20MB per file.
              </p>
              <div className="space-y-3">
                {CUSTOMER_DOCUMENT_SECTIONS.map((section) => {
                  const stage = section.stage;
                  const stageDocs = caseDocumentsEdit
                    .map((doc, idx) => ({ ...doc, idx }))
                    .filter((doc) => doc.stage === stage);
                  const logs = getDocumentTimelineLogs(stage);
                  return (
                    <div key={`detail-edit-${stage}`} className="rounded-md border p-2 space-y-2">
                      <p className="text-sm font-medium">{stage}</p>
                      <p className="text-xs text-muted-foreground">{section.note}</p>
                      {renderDocumentMetaFields(section, caseDocumentMeta, setCaseDocumentMeta)}
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          data-testid={`input-detail-edit-document-upload-${stage}`}
                          type="file"
                          multiple
                          accept={CASE_DOCUMENT_ACCEPT}
                          className="max-w-[220px]"
                          onChange={async (e) => {
                            const input = e.currentTarget;
                            if (section.maxFiles && stageDocs.length + (input.files?.length || 0) > section.maxFiles) {
                              toast({ title: "Maksimal upload tercapai", description: `${stage} maksimal ${section.maxFiles} file`, variant: "destructive" });
                              input.value = "";
                              return;
                            }
                            await handleCaseDocumentUploadEdit(stage, input.files, caseDocumentMeta[stage] || {});
                            input.value = "";
                          }}
                        />
                      </div>
                      {stageDocs.length > 0 && (
                        <div className="space-y-1">
                          {stageDocs.map((doc) => (
                            <div key={`detail-edit-${doc.fileName}-${doc.idx}`} className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs">
                              <div className="min-w-0">
                                <p className="truncate font-medium">{doc.fileName}</p>
                                <p className="truncate text-muted-foreground">{doc.stage}</p>
                                {documentMetaSummary(doc) && <p className="text-muted-foreground">{documentMetaSummary(doc)}</p>}
                              </div>
                              <DocumentFileActions doc={doc} onRemove={() => removeCaseDocumentEdit(doc.idx)} />
                            </div>
                          ))}
                        </div>
                      )}
                      {logs.length > 0 && (
                        <div className="rounded-md bg-muted/40 p-2 text-xs space-y-1">
                          <p className="font-medium">Log tersimpan</p>
                          {logs.map((log) => (
                            <p key={log.id} className="whitespace-pre-wrap text-muted-foreground">{log.content}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveEdit} disabled={updateMutation.isPending} data-testid="button-save-edit">
                {updateMutation.isPending ? "Menyimpan..." : "Simpan Update"}
              </Button>
              <Button variant="secondary" onClick={() => { setEditing(false); setCaseDocumentsEdit([]); setComplaintAttachmentsEdit([]); }} data-testid="button-cancel-edit">Batal</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="detail" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <TabsList>
              <TabsTrigger value="detail" data-testid="tab-detail">Detail</TabsTrigger>
              <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline ({caseUpdates?.length || 0})</TabsTrigger>
              <TabsTrigger value="comments" data-testid="tab-comments">Komentar ({commentsData?.length || 0})</TabsTrigger>
              <TabsTrigger value="meetings" data-testid="tab-meetings">Pertemuan ({meetingsData?.length || 0})</TabsTrigger>
            </TabsList>
            {relatedAccountOptions.length > 0 && (
              <Select value={selectedRelatedAccountItem?.accountNumber || undefined} onValueChange={setSelectedRelatedAccount}>
                <SelectTrigger className="w-full sm:w-52" data-testid="select-related-account">
                  <SelectValue placeholder="Pilih akun terkait" />
                </SelectTrigger>
                <SelectContent>
                  {relatedAccountOptions.map(account => (
                    <SelectItem key={account.accountNumber} value={account.accountNumber}>
                      {account.accountNumber}{account.customerName ? ` - ${account.customerName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <TabsContent value="detail">
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="md:col-span-2">
                <CardContent className="p-4 space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Inti Pengaduan</p>
                    <p className="text-sm">{String(accountField("summary", caseData.summary))}</p>
                  </div>
                  {accountField("complaintChronology", caseData.complaintChronology) !== "-" && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Kronologi Pengaduan Nasabah</p>
                      <p className="text-sm whitespace-pre-wrap">{String(accountField("complaintChronology", caseData.complaintChronology))}</p>
                    </div>
                  )}
                  {complaintAttachments.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Lampiran / Dokumen Pengaduan ({complaintAttachments.length})</p>
                      </div>
                      <div className="space-y-2">
                        {complaintAttachments.map((doc, idx) => (
                          <div
                            key={`complaint-download-${doc.fileName}-${idx}`}
                            className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm hover:bg-muted/40"
                          >
                            <p className="truncate font-medium">{doc.fileName}</p>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(doc.dataUrl, "_blank", "noopener,noreferrer")}>
                                <Eye className="w-4 h-4 text-muted-foreground" />
                              </Button>
                              <a href={doc.dataUrl} download={doc.fileName} className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted" title="Download">
                                <Download className="w-4 h-4 text-muted-foreground" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Workflow Stage</p>
                      <p className="text-sm font-medium">{String(accountField("workflowStage", caseData.workflowStage))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Bucket</p>
                      <p className="text-sm font-medium">{String(accountField("bucket", caseData.bucket))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cabang</p>
                      <p className="text-sm">{String(accountField("branch", caseData.branch || "-"))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">No. Akun</p>
                      <p className="text-sm">{caseData.accountNumber || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Akun Terkait Dipilih</p>
                      {selectedRelatedAccountItem ? (
                        <div className="mt-0.5 flex flex-col gap-1">
                          <Badge variant="outline" className="w-fit text-xs">{selectedRelatedAccountItem.accountNumber}</Badge>
                          <p className="text-sm">{selectedRelatedAccountItem.customerName || "-"}</p>
                        </div>
                      ) : (
                        <p className="text-sm">-</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Akun Terkait</p>
                      {caseData.relatedAccounts ? (
                        <div className="mt-1 flex flex-wrap gap-1.5" data-testid="text-related-accounts">
                          {parseRelatedAccounts(caseData.relatedAccounts, caseData.customerName).map(account => (
                            <Badge key={account.accountNumber} variant="secondary" className="text-xs">
                              {account.accountNumber}{account.customerName ? ` - ${account.customerName}` : ""}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm">-</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">WPB</p>
                      <p className="text-sm" data-testid="text-wpb">{String(accountField("wpbName", caseData.wpbName || "-"))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Manager</p>
                      <p className="text-sm" data-testid="text-manager">{String(accountField("managerName", caseData.managerName || "-"))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Kepala Cabang</p>
                      <p className="text-sm" data-testid="text-branch-head">{String(accountField("branchHead", caseData.branchHead || "-"))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Jalur Penyelesaian</p>
                      <Badge variant={normalizeResolutionPath(String(accountField("resolutionPath", caseData.resolutionPath))) === "Belum Ditentukan" ? "secondary" : "default"} className="mt-0.5" data-testid="text-resolution-path">{normalizeResolutionPath(String(accountField("resolutionPath", caseData.resolutionPath)))}</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Progress</p>
                    <div className="flex items-center gap-3">
                      <Progress value={Number(accountField("progress", caseData.progress))} className="h-2 flex-1" />
                      <span className="text-sm font-medium">{Number(accountField("progress", caseData.progress))}%</span>
                    </div>
                  </div>
                  {meetingCountSummary && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Ringkasan Pertemuan</p>
                      <p className="text-sm" data-testid="text-meeting-summary">{meetingCountSummary}</p>
                    </div>
                  )}
                  {accountField("findings", caseData.findings) !== "-" && <div><p className="text-xs text-muted-foreground mb-1">Temuan</p><p className="text-sm">{String(accountField("findings", caseData.findings))}</p></div>}
                  {accountField("rootCause", caseData.rootCause) !== "-" && <div><p className="text-xs text-muted-foreground mb-1">Root Cause</p><p className="text-sm">{String(accountField("rootCause", caseData.rootCause))}</p></div>}
                  {accountField("customerRequest", caseData.customerRequest) !== "-" && <div><p className="text-xs text-muted-foreground mb-1">Permintaan Nasabah</p><p className="text-sm">{String(accountField("customerRequest", caseData.customerRequest))}</p></div>}
                  {accountField("companyOffer", caseData.companyOffer) !== "-" && <div><p className="text-xs text-muted-foreground mb-1">Penawaran Perusahaan</p><p className="text-sm">{String(accountField("companyOffer", caseData.companyOffer))}</p></div>}
                  {accountField("latestAction", caseData.latestAction) !== "-" && <div><p className="text-xs text-muted-foreground mb-1">Tindakan Terakhir</p><p className="text-sm">{String(accountField("latestAction", caseData.latestAction))}</p></div>}
                  {accountField("nextAction", caseData.nextAction) !== "-" && <div><p className="text-xs text-muted-foreground mb-1">Tindak Lanjut</p><p className="text-sm">{String(accountField("nextAction", caseData.nextAction))}</p></div>}
                  {caseDocuments.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Dokumen Nasabah ({caseDocuments.length})</p>
                      </div>
                      <div className="space-y-2">
                        {caseDocuments.map((doc, idx) => (
                          <div
                            key={`${doc.fileName}-${idx}`}
                            className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm hover:bg-muted/40"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium">{doc.fileName}</p>
                              <p className="truncate text-xs text-muted-foreground">{doc.stage}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(doc.dataUrl, "_blank", "noopener,noreferrer")}>
                                <Eye className="w-4 h-4 text-muted-foreground" />
                              </Button>
                              <a href={doc.dataUrl} download={doc.fileName} className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted" title="Download">
                                <Download className="w-4 h-4 text-muted-foreground" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div><p className="text-xs text-muted-foreground">PIC Utama</p><p className="text-sm font-medium">{String(accountField("picMain", caseData.picMain || "-"))}</p></div>
                  <div><p className="text-xs text-muted-foreground">Dibuat oleh</p><p className="text-sm">{getUserName(caseData.createdBy)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Tanggal Masuk</p><p className="text-sm">{caseData.dateReceived}</p></div>
                  <div><p className="text-xs text-muted-foreground">Target Penyelesaian</p><p className="text-sm">{String(accountField("targetDate", caseData.targetDate || "-"))}</p></div>
                  <div><p className="text-xs text-muted-foreground">Terakhir Diupdate</p><p className="text-sm">{new Date(caseData.updatedAt).toLocaleDateString("id-ID")}</p></div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardContent className="p-4 space-y-4">
                {canUpdate && (
                  <div className="p-3 bg-muted/50 rounded-md space-y-3">
                    <p className="text-sm font-medium">Tambah Update Progress</p>
                    <Textarea data-testid="input-update-content" placeholder="Isi update..." value={updateContent} onChange={e => setUpdateContent(e.target.value)} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger data-testid="select-update-status"><SelectValue placeholder="Status baru (opsional)" /></SelectTrigger>
                        <SelectContent>{["Open", "In Progress", "Closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={newStage} onValueChange={setNewStage}>
                        <SelectTrigger data-testid="select-update-stage"><SelectValue placeholder="Stage baru (opsional)" /></SelectTrigger>
                        <SelectContent>{WORKFLOW_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input data-testid="input-update-progress" type="number" min={0} max={100} placeholder="Progress % baru" value={newProgress ?? ""} onChange={e => setNewProgress(e.target.value ? parseInt(e.target.value) : undefined)} />
                    </div>
                    <Button data-testid="button-submit-update" size="sm" onClick={() => {
                      if (!updateContent.trim()) return;
                      caseUpdateMutation.mutate({ content: updateContent, newStatus: newStatus || null, newStage: newStage || null, newProgress: newProgress ?? null });
                    }} disabled={caseUpdateMutation.isPending}>Tambah Update</Button>
                  </div>
                )}
                {caseUpdates?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Belum ada update</p>}
                <div className="space-y-3">
                  {caseUpdates?.map(u => (
                    <div key={u.id} className="p-3 bg-muted/30 rounded-md space-y-1" data-testid={`update-${u.id}`}>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(u.createdAt).toLocaleString("id-ID")}</span>
                        <span className="font-medium">{getUserName(u.createdBy)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{formatTimelineContent(u.content)}</p>
                      {u.newStatus && <p className="text-xs text-purple-600 dark:text-purple-400">Status: {u.newStatus}</p>}
                      {u.newStage && <p className="text-xs text-blue-600 dark:text-blue-400">Stage: {u.newStage}</p>}
                      {u.newProgress !== null && <p className="text-xs text-emerald-600 dark:text-emerald-400">Progress: {u.newProgress}%</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments">
            <Card>
              <CardContent className="p-4 space-y-3">
                {commentsData?.map(c => (
                  <div key={c.id} className="p-3 bg-muted/50 rounded-md space-y-1" data-testid={`comment-${c.id}`}>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span className="font-medium">{getUserName(c.createdBy)}</span>
                      <span>{new Date(c.createdAt).toLocaleString("id-ID")}</span>
                    </div>
                    <p className="text-sm">{c.content}</p>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Textarea data-testid="input-comment" placeholder="Tulis komentar..." value={commentText} onChange={e => setCommentText(e.target.value)} className="flex-1 min-h-[60px]" />
                  <Button data-testid="button-send-comment" size="icon" onClick={() => {
                    if (!commentText.trim()) return;
                    commentMutation.mutate({ entityType: "case", entityId: id, content: commentText });
                  }} disabled={commentMutation.isPending || !commentText.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meetings">
            <Card>
              <CardContent className="p-4 space-y-4">
                {Object.keys(meetingCountByType).length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap" data-testid="meeting-type-counts">
                    {Object.entries(meetingCountByType).map(([type, count]) => (
                      <Badge key={type} variant="secondary" className="text-xs" data-testid={`badge-meeting-type-${type}`}>
                        {type}: {count}x
                      </Badge>
                    ))}
                  </div>
                )}

                {canUpdate && (
                  <div className="p-3 bg-muted/50 rounded-md space-y-3">
                    <p className="text-sm font-medium">Tambah Pertemuan</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Tanggal</Label>
                        <Input data-testid="input-meeting-date" type="date" value={meetingForm.meetingDate} onChange={e => setMeetingForm({...meetingForm, meetingDate: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Jenis Pertemuan</Label>
                        <Select value={meetingForm.meetingType} onValueChange={v => setMeetingForm({...meetingForm, meetingType: v})}>
                          <SelectTrigger data-testid="select-meeting-type"><SelectValue placeholder="Pilih jenis..." /></SelectTrigger>
                          <SelectContent>
                            {MEETING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Peserta</Label>
                        <Input data-testid="input-meeting-participants" placeholder="Nama peserta..." value={meetingForm.participants} onChange={e => setMeetingForm({...meetingForm, participants: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Lokasi</Label>
                        <Input data-testid="input-meeting-location" placeholder="Lokasi pertemuan..." value={meetingForm.location} onChange={e => setMeetingForm({...meetingForm, location: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Hasil</Label>
                      <Textarea data-testid="input-meeting-result" placeholder="Hasil pertemuan..." value={meetingForm.result} onChange={e => setMeetingForm({...meetingForm, result: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Catatan</Label>
                      <Textarea data-testid="input-meeting-notes" placeholder="Catatan tambahan..." value={meetingForm.notes} onChange={e => setMeetingForm({...meetingForm, notes: e.target.value})} />
                    </div>
                    <Button data-testid="button-submit-meeting" size="sm" onClick={() => {
                      if (!meetingForm.meetingDate || !meetingForm.meetingType) {
                        toast({ title: "Error", description: "Tanggal dan jenis pertemuan wajib diisi", variant: "destructive" });
                        return;
                      }
                      meetingMutation.mutate({
                        caseId: id,
                        meetingDate: meetingForm.meetingDate,
                        meetingType: meetingForm.meetingType,
                        participants: meetingForm.participants || null,
                        location: meetingForm.location || null,
                        result: meetingForm.result || null,
                        notes: meetingForm.notes || null,
                        createdBy: user!.id,
                      });
                    }} disabled={meetingMutation.isPending}>Tambah Pertemuan</Button>
                  </div>
                )}

                {(!meetingsData || meetingsData.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">Belum ada pertemuan</p>
                )}

                <div className="space-y-3">
                  {[...(meetingsData || [])].sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime()).map(m => (
                    <div key={m.id} className="p-3 bg-muted/30 rounded-md space-y-2" data-testid={`meeting-${m.id}`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays className="w-3 h-3" />
                            <span>{new Date(m.meetingDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                          </div>
                          <Badge variant="outline" className="text-xs" data-testid={`badge-meeting-${m.id}`}>{normalizeMeetingType(m.meetingType)}</Badge>
                        </div>
                        {canDeleteMeeting(m.createdBy) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-delete-meeting-${m.id}`}>
                                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Pertemuan?</AlertDialogTitle>
                                <AlertDialogDescription>Pertemuan ini akan dihapus. Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMeetingMutation.mutate(m.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                      {m.participants && (
                        <div className="flex items-start gap-1.5 text-sm">
                          <Users className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                          <span>{m.participants}</span>
                        </div>
                      )}
                      {m.location && (
                        <div className="flex items-start gap-1.5 text-sm">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                          <span>{m.location}</span>
                        </div>
                      )}
                      {m.result && (
                        <div>
                          <p className="text-xs text-muted-foreground">Hasil</p>
                          <p className="text-sm">{m.result}</p>
                        </div>
                      )}
                      {m.notes && (
                        <div>
                          <p className="text-xs text-muted-foreground">Catatan</p>
                          <p className="text-sm">{m.notes}</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">Dibuat oleh: {getUserName(m.createdBy)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
