import { useState, useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, RiskBadge } from "@/components/status-badges";
import { QueryError } from "@/components/query-error";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Trash2, ArrowUpDown, FileWarning, AlertTriangle, Shield, BarChart3, X, MessageCircle, Paperclip, Eye, Download } from "lucide-react";
import { DownloadMenu } from "@/components/download-menu";
import { DataPagination, usePagination } from "@/components/data-pagination";
import { usePageTitle } from "@/hooks/use-page-title";
import type { Case, Company, Branch } from "@shared/schema";
import { apiUrl } from "@/lib/queryClient";

const BUCKETS = [
  "Pemeriksaan Pengaduan Baru", "Disetujui untuk Perdamaian", "Tidak Disetujui untuk Perdamaian",
  "Menunggu Pemeriksaan", "Proses Negosiasi / Mediasi", "Proses Regulator", "Deadlock", "Closed",
];
const RISK_LEVELS = ["Low", "Medium", "High"];
const WORKFLOW_STAGES = ["Pemeriksaan Internal", "Review", "Negosiasi", "Proses Regulator", "Settlement / Deadlock", "Closed"];
const normalizeWorkflowStage = (value?: string | null) => value && value !== "Open" ? value : "Pemeriksaan Internal";
const RESOLUTION_PATHS = ["Belum Ditentukan", "Pialang (Musyawarah)", "BBJ (Mediasi)", "Bappebti", "BAKTI", "Pengadilan", "Kepolisian"];
const SOFT_PLACEHOLDER_CLASS = "placeholder:text-muted-foreground/45";
const LEGACY_RESOLUTION_LABELS: Record<string, string> = {
  "Mediasi Internal": "Pialang (Musyawarah)",
  "Mediasi BBJ": "BBJ (Mediasi)",
  "Sidang Bappebti": "Bappebti",
};
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
  uploadedAt: string;
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
const compactDocumentValue = (value: string) => {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > 90 ? `${text.slice(0, 87)}...` : text;
};
const documentMetaSummary = (doc: CaseDocumentItem) => [
  doc.subStage ? `Proses: ${doc.subStage}` : "",
  doc.meetingDates?.length ? `Tanggal: ${doc.meetingDates.join(", ")}` : "",
  doc.date ? `Tanggal: ${doc.date}` : "",
  doc.dateFrom || doc.dateTo ? `Rentang: ${doc.dateFrom || "-"} s.d ${doc.dateTo || "-"}` : "",
  doc.branchApprovalDate ? `Approval Kacab: ${doc.branchApprovalDate}` : "",
  doc.complianceApprovalDate ? `Approval Kepatuhan: ${doc.complianceApprovalDate}` : "",
  doc.notes ? `Catatan: ${compactDocumentValue(doc.notes)}` : "",
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

function parseCaseDocuments(raw: unknown): CaseDocumentItem[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((doc) =>
      doc &&
      typeof doc.stage === "string" &&
      typeof doc.fileName === "string" &&
      typeof doc.mimeType === "string" &&
      typeof doc.size === "number" &&
      typeof doc.dataUrl === "string",
    );
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
    .filter(item => item.accountNumber);
  return JSON.stringify(cleaned);
}

function RelatedAccountsInput({
  value,
  onChange,
  primaryAccount,
  primaryCustomerName,
  testIdPrefix,
}: {
  value: string;
  onChange: (value: string) => void;
  primaryAccount?: string;
  primaryCustomerName?: string;
  testIdPrefix: string;
}) {
  const [draft, setDraft] = useState("");
  const [hint, setHint] = useState("");
  const accounts = parseRelatedAccounts(value, primaryCustomerName);
  const addAccount = () => {
    const candidates = parseRelatedAccounts(draft, primaryCustomerName);
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
          data-testid={`${testIdPrefix}-related-account-draft`}
          placeholder="Masukkan nomor akun terkait"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              addAccount();
            }
          }}
          className={SOFT_PLACEHOLDER_CLASS}
        />
        <Button type="button" variant="outline" onClick={addAccount} data-testid={`${testIdPrefix}-add-related-account`}>
          <Plus className="w-4 h-4" />
          Tambah
        </Button>
      </div>
      {hint && <p className="text-xs text-amber-600">{hint}</p>}
      {accounts.length > 0 && (
        <div className="space-y-2">
          {accounts.map((account, index) => (
            <div key={`${account.accountNumber}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2" data-testid={`${testIdPrefix}-related-account-row`}>
              <Input value={account.accountNumber} onChange={e => updateAccount(index, { accountNumber: e.target.value })} placeholder="No. akun" className={SOFT_PLACEHOLDER_CLASS} />
              <Input value={account.customerName} onChange={e => updateAccount(index, { customerName: e.target.value })} placeholder="Nama nasabah" className={SOFT_PLACEHOLDER_CLASS} />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeAccount(account.accountNumber)} aria-label={`Hapus ${account.accountNumber}`}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function KasusPage() {
  usePageTitle("Kasus Pengaduan");
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const stageParam = urlParams.get("stage");
  const viewParam = urlParams.get("view");
  const companyParam = urlParams.get("company");
  const initialCompanyFilter = companyParam && /^\d+$/.test(companyParam) ? companyParam : "all";
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState(initialCompanyFilter);
  const [bucketFilter, setBucketFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState(stageParam === "waiting" ? "waiting" : "all");
  const [viewFilter, setViewFilter] = useState<string | null>(viewParam === "active" ? "active" : viewParam === "closed" ? "closed" : null);
  const [sortBy, setSortBy] = useState("date-desc");
  const [uncommentedFilter, setUncommentedFilter] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(searchString.includes("action=new"));
  const [currentPage, setCurrentPage] = useState(1);

  const { data: cases, isLoading, isError, refetch } = useQuery<Case[]>({ queryKey: ["/api/cases"] });
  const { data: uncommentedIds } = useQuery<number[]>({ queryKey: ["/api/uncommented-cases"] });
  const { data: companiesData } = useQuery<Company[]>({ queryKey: ["/api/companies"] });

  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [updatingCase, setUpdatingCase] = useState<Case | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    content: "",
    newStatus: "",
    newStage: "",
    newProgress: "",
  });

  const [branchFilter, setBranchFilter] = useState("all");
  const [resolutionFilter, setResolutionFilter] = useState("all");

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const stage = params.get("stage");
    const view = params.get("view");
    const company = params.get("company");
    setCompanyFilter(company && /^\d+$/.test(company) ? company : "all");
    setBranchFilter("all");
    setCurrentPage(1);
    if (stage === "waiting") {
      setStageFilter("waiting");
      setViewFilter(null);
    } else if (view === "active") {
      setViewFilter("active");
      setStageFilter("all");
    } else if (view === "closed") {
      setViewFilter("closed");
      setStageFilter("all");
    } else if (!stage && !view) {
      setViewFilter(null);
      setStageFilter("all");
    }
  }, [searchString]);
  const isDuDk = ["du", "dk", "cbo", "ceo", "kepatuhan_cabang", "apuppt"].includes(user?.role || "");
  const isAdmin = ["superadmin", "owner"].includes(user?.role || "");

  const { data: myBranches } = useQuery<Branch[]>({
    queryKey: ["/api/branches/my-company"],
    enabled: isDuDk,
  });

  const { data: companyBranches } = useQuery<Branch[]>({
    queryKey: ["/api/companies", companyFilter, "branches"],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/companies/${companyFilter}/branches`), { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAdmin && companyFilter !== "all",
  });

  const availableBranches = isDuDk ? myBranches : (companyFilter !== "all" ? companyBranches : undefined);
  const branchFilterOptions = useMemo(() => Array.from(new Set([
    ...((availableBranches || []).map(branch => branch.name)),
    ...((cases || [])
      .filter(c => companyFilter === "all" || c.companyId?.toString() === companyFilter)
      .map(c => c.branch || "")
      .filter(Boolean)),
  ])).sort((a, b) => a.localeCompare(b)), [availableBranches, cases, companyFilter]);
  const branchFilterDisabled = isAdmin && companyFilter === "all";

  useEffect(() => {
    if (branchFilter === "all") return;
    if (branchFilterDisabled || !branchFilterOptions.includes(branchFilter)) {
      setBranchFilter("all");
      setCurrentPage(1);
    }
  }, [branchFilter, branchFilterDisabled, branchFilterOptions]);

  const [form, setForm] = useState({
    caseCode: "", branch: "", dateReceived: new Date().toISOString().split("T")[0],
    customerName: "", customerJoinDate: "", accountNumber: "", relatedAccounts: "", picMain: "", bucket: "Pemeriksaan Pengaduan Baru",
    status: "Open", summary: "", complaintChronology: "", riskLevel: "Medium", priority: "Medium",
    workflowStage: "Pemeriksaan Internal", progress: 0, targetDate: "",
    companyId: user?.companyId?.toString() || "",
    wpbName: "", managerName: "", branchHead: "", resolutionPath: "Belum Ditentukan",
  });
  const [caseDocuments, setCaseDocuments] = useState<CaseDocumentItem[]>([]);
  const [complaintAttachments, setComplaintAttachments] = useState<CaseDocumentItem[]>([]);
  const [caseDocumentMeta, setCaseDocumentMeta] = useState<Record<string, DocumentMeta>>({});
  const [complaintDocumentMeta, setComplaintDocumentMeta] = useState<Record<string, DocumentMeta>>({});
  const selectedFormCompanyId = form.companyId || user?.companyId?.toString() || "";
  const { data: formCompanyBranches } = useQuery<Branch[]>({
    queryKey: ["/api/companies", selectedFormCompanyId, "branches"],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/companies/${selectedFormCompanyId}/branches`), { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAdmin && selectedFormCompanyId !== "",
  });
  const formBranchOptions = (isDuDk ? myBranches : formCompanyBranches) || [];
  const formBranchNames = form.branch && !formBranchOptions.some(branch => branch.name === form.branch)
    ? [...formBranchOptions.map(branch => branch.name), form.branch]
    : formBranchOptions.map(branch => branch.name);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/cases", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Berhasil", description: "Kasus berhasil dibuat" });
      resetForm();
      setDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal membuat kasus", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!form.caseCode || !form.customerName || !form.summary) {
      toast({ title: "Error", description: "Kode kasus, nama nasabah, dan ringkasan wajib diisi", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      ...form,
      companyId: form.companyId ? parseInt(form.companyId) : user?.companyId,
      progress: Number(form.progress),
      targetDate: form.targetDate || null,
      accountNumber: form.accountNumber || null,
      customerJoinDate: form.customerJoinDate || null,
      relatedAccounts: form.relatedAccounts || null,
      branch: form.branch || null,
      picMain: form.picMain || null,
      branchHead: form.branchHead || null,
      wpbName: form.wpbName || null,
      managerName: form.managerName || null,
      resolutionPath: form.resolutionPath,
      complaintChronology: form.complaintChronology || null,
      complaintAttachments,
      caseDocuments,
    });
  };

  const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleCaseDocumentUpload = async (stage: string, files: FileList | null, meta: DocumentMeta = {}) => {
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
      setCaseDocuments(prev => [...prev, ...encoded]);
      toast({ title: "Berhasil", description: `${encoded.length} dokumen ditambahkan` });
    } catch {
      toast({ title: "Gagal", description: "Gagal membaca dokumen", variant: "destructive" });
    }
  };

  const removeCaseDocument = (index: number) => {
    setCaseDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplaintAttachmentUpload = async (stage: string, files: FileList | null, meta: DocumentMeta = {}) => {
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
      setComplaintAttachments(prev => [...prev, ...encoded]);
      toast({ title: "Berhasil", description: `${encoded.length} lampiran ditambahkan` });
    } catch {
      toast({ title: "Gagal", description: "Gagal membaca lampiran", variant: "destructive" });
    }
  };

  const removeComplaintAttachment = (index: number) => {
    setComplaintAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const riskOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

  const waitingStages = ["Proses Regulator", "Settlement / Deadlock"];

  const filtered = (cases?.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = c.caseCode.toLowerCase().includes(s) ||
      c.customerName.toLowerCase().includes(s) ||
      (c.summary || "").toLowerCase().includes(s) ||
      (c.accountNumber || "").toLowerCase().includes(s) ||
      (c.relatedAccounts || "").toLowerCase().includes(s);
    const matchRisk = riskFilter === "all" || c.riskLevel === riskFilter;
    const matchCompany = companyFilter === "all" || c.companyId?.toString() === companyFilter;
    const matchBucket = bucketFilter === "all" || c.bucket === bucketFilter;
    const matchStage = stageFilter === "all" || (stageFilter === "waiting" ? waitingStages.includes(c.workflowStage) && c.status !== "Closed" : c.workflowStage === stageFilter);
    const matchBranch = branchFilter === "all" || c.branch === branchFilter;
    const caseResolution = normalizeResolutionPath(c.resolutionPath);
    const matchResolution = resolutionFilter === "all" || caseResolution === resolutionFilter;
    const matchUncommented = !uncommentedFilter || (uncommentedIds || []).includes(c.id);
    let matchView = true;
    if (viewFilter === "active") {
      matchView = c.status !== "Closed";
    } else if (viewFilter === "closed") {
      matchView = c.status === "Closed";
    }
    return matchSearch && matchRisk && matchCompany && matchBucket && matchStage && matchBranch && matchResolution && matchView && matchUncommented;
  }) || []).sort((a, b) => {
    switch (sortBy) {
      case "date-asc": return a.dateReceived.localeCompare(b.dateReceived);
      case "date-desc": return b.dateReceived.localeCompare(a.dateReceived);
      case "progress-asc": return a.progress - b.progress;
      case "progress-desc": return b.progress - a.progress;
      case "risk-desc": return (riskOrder[b.riskLevel] || 0) - (riskOrder[a.riskLevel] || 0);
      case "risk-asc": return (riskOrder[a.riskLevel] || 0) - (riskOrder[b.riskLevel] || 0);
      default: return 0;
    }
  });

  const { totalPages, totalItems, getPageItems } = usePagination(filtered, 20);
  const pagedItems = getPageItems(currentPage);
  const getCompanyName = (id: number) => companiesData?.find(c => c.id === id)?.code || "-";
  const canCreate = ["du", "dk", "cbo", "ceo", "kepatuhan_cabang", "apuppt"].includes(user?.role || "");
  const canDeleteCase = (c: Case) => ["superadmin", "owner", "du", "dk", "apuppt"].includes(user?.role || "") || c.createdBy === user?.id;
  const hasSummaryFilters = riskFilter !== "all" || companyFilter !== "all" || branchFilter !== "all" || bucketFilter !== "all" || resolutionFilter !== "all";
  const clearCompanyUrlParam = () => {
    const params = new URLSearchParams(searchString);
    if (!params.has("company")) return;
    params.delete("company");
    const nextSearch = params.toString();
    setLocation(nextSearch ? `/kasus?${nextSearch}` : "/kasus");
  };
  const resetSummaryFilters = () => {
    setRiskFilter("all");
    setCompanyFilter("all");
    setBranchFilter("all");
    setBucketFilter("all");
    setResolutionFilter("all");
    setCurrentPage(1);
    clearCompanyUrlParam();
  };
  const toggleSummaryFilter = (type: "risk" | "company" | "bucket" | "resolution", value: string) => {
    if (type === "risk") setRiskFilter(prev => prev === value ? "all" : value);
    if (type === "company") {
      const nextCompanyFilter = companyFilter === value ? "all" : value;
      setCompanyFilter(nextCompanyFilter);
      setBranchFilter("all");
      if (nextCompanyFilter === "all") clearCompanyUrlParam();
    }
    if (type === "bucket") setBucketFilter(prev => prev === value ? "all" : value);
    if (type === "resolution") setResolutionFilter(prev => prev === value ? "all" : value);
    setCurrentPage(1);
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
    const nextDates = [...(current.meetingDates || []), ""];
    return { ...prev, [stage]: { ...current, meetingDates: nextDates } };
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
    const nextDates = (current.meetingDates || []).filter((_, i) => i !== index);
    return { ...prev, [stage]: { ...current, meetingDates: nextDates } };
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
        {section.fields.includes("subStage") && section.subStages && (
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Proses {section.stage}</Label>
            <Select value={current.subStage || ""} onValueChange={v => updateDocumentMeta(setter, section.stage, "subStage", v)}>
              <SelectTrigger><SelectValue placeholder={`Pilih proses ${section.stage}`} /></SelectTrigger>
              <SelectContent>{section.subStages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        {section.fields.includes("date") && (
          <div className="space-y-1">
            <Label className="text-xs">Tanggal</Label>
            <Input type="date" value={current.date || ""} onChange={e => updateDocumentMeta(setter, section.stage, "date", e.target.value)} />
          </div>
        )}
        {section.fields.includes("dateRange") && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Dari Tanggal</Label>
              <Input type="date" value={current.dateFrom || ""} onChange={e => updateDocumentMeta(setter, section.stage, "dateFrom", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sampai Tanggal</Label>
              <Input type="date" value={current.dateTo || ""} onChange={e => updateDocumentMeta(setter, section.stage, "dateTo", e.target.value)} />
            </div>
          </>
        )}
        {section.fields.includes("multiDates") && (
          <div className="space-y-2 sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Tanggal</Label>
              <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => addDocumentMeetingDate(setter, section.stage)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {meetingDates.map((date, index) => (
              <div key={`${section.stage}-meeting-date-${index}`} className="flex items-center gap-2">
                <Input type="date" value={date} onChange={e => updateDocumentMeetingDate(setter, section.stage, index, e.target.value)} />
                {meetingDates.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => removeDocumentMeetingDate(setter, section.stage, index)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        {section.fields.includes("approvalDates") && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Approval Kacab</Label>
              <Input type="date" value={current.branchApprovalDate || ""} onChange={e => updateDocumentMeta(setter, section.stage, "branchApprovalDate", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Approval Kepatuhan</Label>
              <Input type="date" value={current.complianceApprovalDate || ""} onChange={e => updateDocumentMeta(setter, section.stage, "complianceApprovalDate", e.target.value)} />
            </div>
          </>
        )}
        {section.fields.includes("notes") && (
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Catatan</Label>
            <Textarea value={current.notes || ""} onChange={e => updateDocumentMeta(setter, section.stage, "notes", e.target.value)} />
          </div>
        )}
      </div>
    );
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/cases/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Berhasil", description: "Kasus berhasil dihapus" });
    },
    onError: (err: any) => { toast({ title: "Gagal", description: err.message || "Gagal menghapus", variant: "destructive" }); },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/cases/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Berhasil", description: "Kasus berhasil diperbarui" });
      setEditDialogOpen(false);
      setEditingCase(null);
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal memperbarui kasus", variant: "destructive" });
    },
  });

  const progressUpdateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("POST", `/api/cases/${id}/updates`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (updatingCase) queryClient.invalidateQueries({ queryKey: ["/api/cases", updatingCase.id, "updates"] });
      toast({ title: "Berhasil", description: "Status/progress kasus berhasil diupdate" });
      setUpdateDialogOpen(false);
      setUpdatingCase(null);
      setUpdateForm({ content: "", newStatus: "", newStage: "", newProgress: "" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal update status/progress", variant: "destructive" });
    },
  });

  const resetForm = () => setForm({
    caseCode: "", branch: "", dateReceived: new Date().toISOString().split("T")[0],
    customerName: "", customerJoinDate: "", accountNumber: "", relatedAccounts: "", picMain: "", bucket: "Pemeriksaan Pengaduan Baru",
    status: "Open", summary: "", complaintChronology: "", riskLevel: "Medium", priority: "Medium",
    workflowStage: "Pemeriksaan Internal", progress: 0, targetDate: "",
    companyId: user?.companyId?.toString() || "",
    wpbName: "", managerName: "", branchHead: "", resolutionPath: "Belum Ditentukan",
  });
  const resetCaseDocuments = () => {
    setCaseDocuments([]);
    setComplaintAttachments([]);
    setCaseDocumentMeta({});
    setComplaintDocumentMeta({});
  };

  const openEditDialog = (c: Case, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingCase(c);
    setForm({
      caseCode: c.caseCode,
      branch: c.branch || "",
      dateReceived: c.dateReceived,
      customerName: c.customerName,
      customerJoinDate: c.customerJoinDate || "",
      accountNumber: c.accountNumber || "",
      relatedAccounts: c.relatedAccounts || "",
      picMain: c.picMain || "",
      branchHead: c.branchHead || "",
      bucket: c.bucket,
      status: c.status,
      summary: c.summary,
      complaintChronology: c.complaintChronology || "",
      riskLevel: c.riskLevel,
      priority: c.priority,
      workflowStage: normalizeWorkflowStage(c.workflowStage),
      progress: c.progress,
      targetDate: c.targetDate || "",
      companyId: c.companyId?.toString() || "",
      wpbName: c.wpbName || "",
      managerName: c.managerName || "",
      resolutionPath: normalizeResolutionPath(c.resolutionPath),
    });
    setCaseDocuments(parseCaseDocuments((c as any).caseDocuments));
    setComplaintAttachments(parseCaseDocuments((c as any).complaintAttachments));
    setEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editingCase) return;
    if (!form.caseCode || !form.customerName || !form.summary) {
      toast({ title: "Error", description: "Kode kasus, nama nasabah, dan ringkasan wajib diisi", variant: "destructive" });
      return;
    }
    editMutation.mutate({
      id: editingCase.id,
      data: {
        caseCode: form.caseCode,
        customerName: form.customerName,
        customerJoinDate: form.customerJoinDate || null,
        summary: form.summary,
        complaintChronology: form.complaintChronology || null,
        branch: form.branch || null,
        dateReceived: form.dateReceived,
        accountNumber: form.accountNumber || null,
        relatedAccounts: form.relatedAccounts || null,
        picMain: form.picMain || null,
        branchHead: form.branchHead || null,
        bucket: form.bucket,
        status: form.status,
        riskLevel: form.riskLevel,
        priority: form.priority,
        workflowStage: form.workflowStage,
        progress: Number(form.progress),
        targetDate: form.targetDate || null,
        wpbName: form.wpbName || null,
        managerName: form.managerName || null,
        resolutionPath: form.resolutionPath,
        complaintAttachments,
        caseDocuments,
      },
    });
  };

  const openUpdateDialog = (c: Case, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setUpdatingCase(c);
    setUpdateForm({
      content: "",
      newStatus: c.status || "Open",
      newStage: normalizeWorkflowStage(c.workflowStage),
      newProgress: String(c.progress ?? 0),
    });
    setUpdateDialogOpen(true);
  };

  const handleProgressUpdateSubmit = () => {
    if (!updatingCase) return;
    if (!updateForm.content.trim()) {
      toast({ title: "Error", description: "Catatan update wajib diisi", variant: "destructive" });
      return;
    }
    const parsedProgress = updateForm.newProgress === "" ? undefined : Number(updateForm.newProgress);
    if (parsedProgress !== undefined && (Number.isNaN(parsedProgress) || parsedProgress < 0 || parsedProgress > 100)) {
      toast({ title: "Error", description: "Progress harus 0 sampai 100", variant: "destructive" });
      return;
    }
    progressUpdateMutation.mutate({
      id: updatingCase.id,
      data: {
        content: updateForm.content.trim(),
        newStatus: updateForm.newStatus || null,
        newStage: updateForm.newStage || null,
        newProgress: parsedProgress,
      },
    });
  };

  const canUpdateCase = () => ["superadmin", "du", "dk", "cbo", "ceo", "kepatuhan_cabang", "apuppt"].includes(user?.role || "");
  const canEditCase = (c: Case) => ["superadmin", "du", "dk", "kepatuhan_cabang", "apuppt"].includes(user?.role || "") || c.createdBy === user?.id;

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Kasus Pengaduan</h1>
          <p className="text-sm text-muted-foreground">
            {viewFilter === "active" ? "Menampilkan kasus aktif" : viewFilter === "closed" ? "Menampilkan kasus selesai" : "Daftar kasus pengaduan yang tercatat"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DownloadMenu
            title="Laporan Kasus Pengaduan"
            filename="laporan_kasus"
            columns={[
              { header: "Kode Kasus", key: "caseCode", width: 15 },
              { header: "Nasabah", key: "customerName", width: 20 },
              { header: "Tanggal Bergabung Nasabah", key: "customerJoinDate", width: 18 },
              { header: "PT", key: "_company", width: 10 },
              { header: "Cabang", key: "branch", width: 15 },
              { header: "Risk", key: "riskLevel", width: 8 },
              { header: "Status", key: "status", width: 12 },
              { header: "Stage", key: "workflowStage", width: 15 },
              { header: "Progress", key: "_progress", width: 10 },
              { header: "Ringkasan", key: "summary", width: 30 },
            ]}
            data={filtered.map(c => ({ ...c, _company: getCompanyName(c.companyId), _progress: `${c.progress}%` }))}
          />
          {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              resetForm();
              resetCaseDocuments();
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-case"><Plus className="w-4 h-4 mr-1" /> Tambah Kasus</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Tambah Kasus Baru</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Kode Kasus *</Label>
                    <Input data-testid="input-case-code" placeholder="SGF-2024-003" value={form.caseCode} onChange={e => setForm({...form, caseCode: e.target.value})} className={SOFT_PLACEHOLDER_CLASS} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tanggal Masuk *</Label>
                    <Input data-testid="input-case-date" type="date" value={form.dateReceived} onChange={e => setForm({...form, dateReceived: e.target.value})} />
                  </div>
                </div>
                {["superadmin", "owner"].includes(user?.role || "") && (
                  <div className="space-y-1.5">
                    <Label>PT</Label>
                    <Select value={form.companyId} onValueChange={v => setForm({...form, companyId: v, branch: ""})}>
                      <SelectTrigger className="text-muted-foreground/70"><SelectValue placeholder="Pilih PT" /></SelectTrigger>
                      <SelectContent>{companiesData?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.code}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Nama Nasabah *</Label>
                    <Input data-testid="input-case-customer" placeholder="Nama nasabah" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} className={SOFT_PLACEHOLDER_CLASS} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tanggal Bergabung Nasabah</Label>
                    <Input data-testid="input-case-customer-join-date" type="date" value={form.customerJoinDate} onChange={e => setForm({...form, customerJoinDate: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>No. Akun</Label>
                    <Input data-testid="input-case-account" placeholder="Nomor akun" value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})} className={SOFT_PLACEHOLDER_CLASS} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Akun Terkait</Label>
                  <RelatedAccountsInput
                    value={form.relatedAccounts}
                    primaryAccount={form.accountNumber}
                    primaryCustomerName={form.customerName}
                    onChange={relatedAccounts => setForm(prev => ({...prev, relatedAccounts}))}
                    testIdPrefix="input-case"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Cabang</Label>
                    <Select value={form.branch || undefined} onValueChange={v => setForm({...form, branch: v})}>
                      <SelectTrigger data-testid="select-case-branch" className="text-muted-foreground/70">
                        <SelectValue placeholder={formBranchOptions.length ? "Pilih cabang" : "Belum ada cabang"} />
                      </SelectTrigger>
                      <SelectContent>
                        {formBranchNames.map(branch => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Marketing</Label>
                    <Input data-testid="input-case-pic" placeholder="Marketing" value={form.picMain} onChange={e => setForm({...form, picMain: e.target.value})} className={SOFT_PLACEHOLDER_CLASS} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>WPB</Label>
                    <Input data-testid="input-case-wpb" placeholder="Nama WPB" value={form.wpbName} onChange={e => setForm({...form, wpbName: e.target.value})} className={SOFT_PLACEHOLDER_CLASS} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Manager</Label>
                    <Input data-testid="input-case-manager" placeholder="Nama Manager" value={form.managerName} onChange={e => setForm({...form, managerName: e.target.value})} className={SOFT_PLACEHOLDER_CLASS} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Kepala Cabang</Label>
                    <Input data-testid="input-case-branch-head" placeholder="Nama Kepala Cabang" value={form.branchHead} onChange={e => setForm({...form, branchHead: e.target.value})} className={SOFT_PLACEHOLDER_CLASS} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Jalur Penyelesaian</Label>
                  <Select value={form.resolutionPath} onValueChange={v => setForm({...form, resolutionPath: v})}>
                    <SelectTrigger data-testid="select-case-resolution"><SelectValue /></SelectTrigger>
                    <SelectContent>{RESOLUTION_PATHS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Inti Pengaduan *</Label>
                  <Textarea data-testid="input-case-summary" placeholder="Ringkasan pengaduan" value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} className={SOFT_PLACEHOLDER_CLASS} />
                </div>
                <div className="space-y-1.5">
                  <Label>Kronologi Pengaduan Nasabah</Label>
                  <Textarea
                    data-testid="input-case-complaint-chronology"
                    placeholder="Tuliskan kronologi pengaduan nasabah"
                    value={form.complaintChronology}
                    onChange={e => setForm({...form, complaintChronology: e.target.value})}
                    className={SOFT_PLACEHOLDER_CLASS}
                  />
                </div>
                <div className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                    <Label className="font-medium">Dokumen Pengaduan Nasabah</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">Format: PDF, JPG/JPEG, PNG, DOC/DOCX, XLS/XLSX. Maks 20MB per file.</p>
                  <div className="space-y-3">
                    {COMPLAINT_DOCUMENT_SECTIONS.map((section) => {
                      const currentMeta = complaintDocumentMeta[section.stage] || {};
                      const uploadStage = currentMeta.subStage ? `${section.stage} - ${currentMeta.subStage}` : section.stage;
                      const docs = complaintAttachments.map((doc, idx) => ({ ...doc, idx })).filter((doc) => doc.stage === section.stage || doc.stage.startsWith(`${section.stage} - `));
                      return (
                        <div key={section.stage} className="rounded-md border p-2 space-y-2">
                          <p className="text-sm font-medium">{section.stage}</p>
                          <p className="text-xs text-muted-foreground">{section.note}</p>
                          {renderDocumentMetaFields(section, complaintDocumentMeta, setComplaintDocumentMeta)}
                          <Input
                            data-testid={`input-case-complaint-document-upload-${section.stage}`}
                            type="file"
                            multiple
                            accept={CASE_DOCUMENT_ACCEPT}
                            onChange={async (e) => {
                              const input = e.currentTarget;
                              await handleComplaintAttachmentUpload(uploadStage, input.files, currentMeta);
                              input.value = "";
                            }}
                          />
                          {docs.map((doc) => (
                            <div key={`complaint-${doc.fileName}-${doc.idx}`} className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs">
                              <div className="min-w-0">
                                <p className="truncate font-medium">{doc.fileName}</p>
                                <p className="truncate text-muted-foreground">{doc.stage}</p>
                                {documentMetaSummary(doc) && <p className="text-muted-foreground">{documentMetaSummary(doc)}</p>}
                              </div>
                              <DocumentFileActions doc={doc} onRemove={() => removeComplaintAttachment(doc.idx)} />
                            </div>
                          ))}
                        </div>
                      );
                    })}
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
                      const stageDocs = caseDocuments
                        .map((doc, idx) => ({ ...doc, idx }))
                        .filter((doc) => doc.stage === stage);
                      return (
                        <div key={stage} className="rounded-md border p-2 space-y-2">
                          <p className="text-sm font-medium">{stage}</p>
                          <p className="text-xs text-muted-foreground">{section.note}</p>
                          {renderDocumentMetaFields(section, caseDocumentMeta, setCaseDocumentMeta)}
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              data-testid={`input-case-document-upload-${stage}`}
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
                                await handleCaseDocumentUpload(stage, input.files, caseDocumentMeta[stage] || {});
                                input.value = "";
                              }}
                            />
                          </div>
                          {stageDocs.length > 0 && (
                            <div className="space-y-1">
                              {stageDocs.map((doc) => (
                                <div key={`${doc.fileName}-${doc.idx}`} className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs">
                                  <div className="min-w-0">
                                    <p className="truncate font-medium">{doc.fileName}</p>
                                    <p className="truncate text-muted-foreground">{doc.stage}</p>
                                    {documentMetaSummary(doc) && <p className="text-muted-foreground">{documentMetaSummary(doc)}</p>}
                                  </div>
                                  <DocumentFileActions doc={doc} onRemove={() => removeCaseDocument(doc.idx)} />
                                </div>
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
                    <Label>Risk Level</Label>
                    <Select value={form.riskLevel} onValueChange={v => setForm({...form, riskLevel: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Bucket</Label>
                    <Select value={form.bucket} onValueChange={v => setForm({...form, bucket: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{BUCKETS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Target</Label>
                    <Input data-testid="input-case-target" type="date" value={form.targetDate} onChange={e => setForm({...form, targetDate: e.target.value})} />
                  </div>
                </div>
                <Button data-testid="button-submit-case" onClick={handleSubmit} className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Menyimpan..." : "Simpan Kasus"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        </div>
      </div>

      {viewFilter && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1.5 text-sm" data-testid="badge-view-filter">
            <Filter className="w-3 h-3" />
            {viewFilter === "active" ? "Kasus Aktif" : "Kasus Selesai"}
            <button
              onClick={() => { setViewFilter(null); setLocation("/kasus"); }}
              className="ml-1 hover:bg-muted rounded-full p-0.5"
              data-testid="button-clear-view-filter"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input data-testid="input-search-case" placeholder="Cari kode kasus, no. akun, nasabah, atau ringkasan..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-10" />
          </div>
          <Select value={sortBy} onValueChange={v => { setSortBy(v); setCurrentPage(1); }}>
            <SelectTrigger data-testid="select-sort-case" className="w-full sm:w-48">
              <ArrowUpDown className="w-4 h-4 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Terbaru</SelectItem>
              <SelectItem value="date-asc">Terlama</SelectItem>
              <SelectItem value="risk-desc">Risiko Tertinggi</SelectItem>
              <SelectItem value="risk-asc">Risiko Terendah</SelectItem>
              <SelectItem value="progress-desc">Progress Tertinggi</SelectItem>
              <SelectItem value="progress-asc">Progress Terendah</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {isAdmin && (
            <Select
              value={companyFilter}
              onValueChange={value => {
                setCompanyFilter(value);
                setBranchFilter("all");
                setCurrentPage(1);
                if (value === "all") clearCompanyUrlParam();
              }}
            >
              <SelectTrigger data-testid="select-filter-company" className="h-9 col-span-2 sm:col-span-1 sm:w-44">
                <SelectValue placeholder="Semua PT" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua PT</SelectItem>
                {companiesData?.map(company => (
                  <SelectItem key={company.id} value={company.id.toString()}>{company.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select
            value={branchFilter}
            onValueChange={value => {
              setBranchFilter(value);
              setCurrentPage(1);
            }}
            disabled={branchFilterDisabled || branchFilterOptions.length === 0}
          >
            <SelectTrigger data-testid="select-filter-branch" className="h-9 col-span-2 sm:col-span-1 sm:w-52">
              <SelectValue placeholder={branchFilterDisabled ? "Pilih PT dulu" : "Semua cabang"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Cabang</SelectItem>
              {branchFilterOptions.map(branch => (
                <SelectItem key={branch} value={branch}>{branch}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={uncommentedFilter ? "default" : "outline"}
            size="sm"
            className="h-9 gap-1.5 col-span-2 sm:col-span-1 sm:w-auto"
            onClick={() => { setUncommentedFilter(!uncommentedFilter); setCurrentPage(1); }}
            data-testid="button-filter-uncommented"
          >
            <MessageCircle className="w-4 h-4" />
            Belum Saya Komentari
            {uncommentedIds && uncommentedIds.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs" data-testid="badge-uncommented-count">{uncommentedIds.length}</Badge>
            )}
          </Button>
        </div>
      </div>

      {!isLoading && !isError && cases && cases.length > 0 && (() => {
        const summarySource = cases.filter(c => {
          const s = search.toLowerCase();
          const matchSearch = c.caseCode.toLowerCase().includes(s) ||
            c.customerName.toLowerCase().includes(s) ||
            (c.summary || "").toLowerCase().includes(s) ||
            (c.accountNumber || "").toLowerCase().includes(s) ||
            (c.relatedAccounts || "").toLowerCase().includes(s);
          const matchCompany = companyFilter === "all" || c.companyId?.toString() === companyFilter;
          const matchStage = stageFilter === "all" || (stageFilter === "waiting" ? waitingStages.includes(c.workflowStage) && c.status !== "Closed" : c.workflowStage === stageFilter);
          const matchBranch = branchFilter === "all" || c.branch === branchFilter;
          const matchUncommented = !uncommentedFilter || (uncommentedIds || []).includes(c.id);
          let matchView = true;
          if (viewFilter === "active") {
            matchView = c.status !== "Closed";
          } else if (viewFilter === "closed") {
            matchView = c.status === "Closed";
          }
          return matchSearch && matchCompany && matchStage && matchBranch && matchView && matchUncommented;
        });
        const total = filtered.length;
        const byRisk = { High: 0, Medium: 0, Low: 0 } as Record<string, number>;
        const byCompany: Record<string, number> = {};
        const byBucket: Record<string, number> = {};
        const byResolution: Record<string, number> = {};
        summarySource.forEach(c => {
          byRisk[c.riskLevel] = (byRisk[c.riskLevel] || 0) + 1;
          const companyKey = c.companyId?.toString() || "";
          byCompany[companyKey] = (byCompany[companyKey] || 0) + 1;
          byBucket[c.bucket] = (byBucket[c.bucket] || 0) + 1;
          const resolutionPath = normalizeResolutionPath(c.resolutionPath);
          byResolution[resolutionPath] = (byResolution[resolutionPath] || 0) + 1;
        });
        return (
          <Card data-testid="card-case-summary">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span>Ringkasan</span>
                <button type="button" onClick={resetSummaryFilters} disabled={!hasSummaryFilters} className="ml-1 disabled:cursor-default" data-testid="button-reset-summary-filters">
                  <Badge variant={hasSummaryFilters ? "default" : "secondary"} data-testid="text-total-cases">{total} kasus</Badge>
                </button>
              </div>
              <div className={`grid grid-cols-1 ${isAdmin ? "sm:grid-cols-4" : "sm:grid-cols-3"} gap-4 text-xs`}>
                <div>
                  <p className="font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Risk Level</p>
                  <div className="space-y-1">
                    {["High", "Medium", "Low"].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleSummaryFilter("risk", r)}
                        className={`flex w-full items-center justify-between rounded px-1 py-0.5 text-left transition hover:bg-muted ${riskFilter === r ? "bg-primary/10 text-primary" : ""}`}
                        data-testid={`button-summary-risk-${r.toLowerCase()}`}
                      >
                        <span className={riskFilter === r ? "font-semibold" : r === "High" ? "text-red-600 dark:text-red-400 font-medium" : r === "Medium" ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}>{r}</span>
                        <span className="font-medium">{byRisk[r] || 0}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {isAdmin && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Shield className="w-3 h-3" /> PT</p>
                    <div className="space-y-1">
                      {Object.entries(byCompany).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                        <button
                          key={k || "unknown-company"}
                          type="button"
                          onClick={() => k && toggleSummaryFilter("company", k)}
                          className={`flex w-full items-center justify-between gap-2 rounded px-1 py-0.5 text-left transition hover:bg-muted ${companyFilter === k ? "bg-primary/10 text-primary" : ""}`}
                          data-testid={`button-summary-company-${k || "unknown"}`}
                        >
                          <span className="truncate">{k ? getCompanyName(Number(k)) : "-"}</span>
                          <span className="font-medium flex-shrink-0">{v}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><FileWarning className="w-3 h-3" /> Bucket</p>
                  <div className="space-y-1">
                    {Object.entries(byBucket).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => toggleSummaryFilter("bucket", k)}
                        className={`flex w-full items-center justify-between gap-2 rounded px-1 py-0.5 text-left transition hover:bg-muted ${bucketFilter === k ? "bg-primary/10 text-primary" : ""}`}
                        data-testid={`button-summary-bucket-${k.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                      >
                        <span className="truncate">{k}</span>
                        <span className="font-medium flex-shrink-0">{v}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Shield className="w-3 h-3" /> Jalur</p>
                  <div className="space-y-1">
                    {Object.entries(byResolution).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => toggleSummaryFilter("resolution", k)}
                        className={`flex w-full items-center justify-between gap-2 rounded px-1 py-0.5 text-left transition hover:bg-muted ${resolutionFilter === k ? "bg-primary/10 text-primary" : ""}`}
                        data-testid={`button-summary-resolution-${k.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                      >
                        <span className="truncate">{k}</span>
                        <span className="font-medium flex-shrink-0">{v}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {isError ? (
        <QueryError message="Gagal memuat data kasus. Silakan coba lagi." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Belum ada kasus yang sesuai filter</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {pagedItems.map(c => (
            <Card key={c.id} className="hover-elevate" data-testid={`card-case-${c.id}`}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <Link href={`/kasus/${c.id}`} className="flex-1 min-w-0 space-y-1.5 cursor-pointer">
                    <div className="flex items-center gap-2 flex-wrap">
                      {(uncommentedIds || []).includes(c.id) && (
                        <span className="relative flex h-2.5 w-2.5 flex-shrink-0" data-testid={`dot-uncommented-${c.id}`}>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                        </span>
                      )}
                      <span className="font-semibold text-sm text-primary" data-testid={`text-account-${c.id}`}>No. Akun: {c.accountNumber || "-"}</span>
                      <span className="text-xs text-muted-foreground">{c.caseCode}</span>
                      <RiskBadge level={c.riskLevel} />
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-sm">{c.customerName}</p>
                    {c.customerJoinDate && (
                      <p className="text-xs text-muted-foreground">Bergabung: {c.customerJoinDate}</p>
                    )}
                    {c.relatedAccounts && (
                      <div className="flex flex-wrap gap-1" data-testid={`text-related-accounts-${c.id}`}>
                        {parseRelatedAccounts(c.relatedAccounts, c.customerName).slice(0, 4).map(account => (
                          <Badge key={account.accountNumber} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {account.accountNumber}{account.customerName ? ` - ${account.customerName}` : ""}
                          </Badge>
                        ))}
                        {parseRelatedAccounts(c.relatedAccounts, c.customerName).length > 4 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{parseRelatedAccounts(c.relatedAccounts, c.customerName).length - 4}</Badge>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-1">{c.summary}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>{getCompanyName(c.companyId)}</span>
                      {c.branch && <span>{c.branch}</span>}
                      <span>{c.workflowStage}</span>
                      {normalizeResolutionPath(c.resolutionPath) !== "Belum Ditentukan" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0" data-testid={`badge-resolution-${c.id}`}>{normalizeResolutionPath(c.resolutionPath)}</Badge>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-medium">{c.progress}%</p>
                      <Progress value={c.progress} className="h-1.5 w-20" />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" data-testid={`button-view-case-${c.id}`} asChild>
                      <Link href={`/kasus/${c.id}`}>
                        <Eye className="w-4 h-4" />
                      </Link>
                    </Button>
                    {canUpdateCase() && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" data-testid={`button-update-case-${c.id}`} onClick={(e) => openUpdateDialog(c, e)}>
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    )}
                    {canDeleteCase(c) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" data-testid={`button-delete-case-${c.id}`} onClick={e => e.stopPropagation()}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Kasus?</AlertDialogTitle>
                            <AlertDialogDescription>Kasus "{c.caseCode} - {c.customerName}" akan dihapus. Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid={`button-confirm-delete-case-${c.id}`}>Hapus</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <DataPagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={setCurrentPage} />
        </div>
      )}

      <Dialog open={updateDialogOpen} onOpenChange={(open) => {
        setUpdateDialogOpen(open);
        if (!open) {
          setUpdatingCase(null);
          setUpdateForm({ content: "", newStatus: "", newStage: "", newProgress: "" });
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Update Status / Progress</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {updatingCase && (
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-sm font-medium">{updatingCase.caseCode} - {updatingCase.customerName}</p>
                <p className="text-xs text-muted-foreground">
                  Status saat ini: {updatingCase.status} | Stage: {updatingCase.workflowStage} | Progress: {updatingCase.progress}%
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={updateForm.newStatus} onValueChange={v => setUpdateForm({...updateForm, newStatus: v})}>
                  <SelectTrigger data-testid="select-update-case-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Open", "In Progress", "Closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select value={updateForm.newStage} onValueChange={v => setUpdateForm({...updateForm, newStage: v})}>
                  <SelectTrigger data-testid="select-update-case-stage"><SelectValue /></SelectTrigger>
                  <SelectContent>{WORKFLOW_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Progress (%)</Label>
                <Input
                  data-testid="input-update-case-progress"
                  type="number"
                  min={0}
                  max={100}
                  value={updateForm.newProgress}
                  onChange={e => setUpdateForm({...updateForm, newProgress: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Catatan Update *</Label>
              <Textarea
                data-testid="input-update-case-content"
                placeholder="Contoh: Sudah dilakukan follow up, menunggu dokumen tambahan..."
                value={updateForm.content}
                onChange={e => setUpdateForm({...updateForm, content: e.target.value})}
              />
            </div>
            <Button data-testid="button-submit-update-case" onClick={handleProgressUpdateSubmit} className="w-full" disabled={progressUpdateMutation.isPending}>
              {progressUpdateMutation.isPending ? "Menyimpan..." : "Simpan Update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={(o) => { setEditDialogOpen(o); if (!o) { setEditingCase(null); resetForm(); resetCaseDocuments(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Kasus</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kode Kasus *</Label>
                <Input data-testid="input-edit-case-code" value={form.caseCode} onChange={e => setForm({...form, caseCode: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Masuk</Label>
                <Input data-testid="input-edit-case-date" type="date" value={form.dateReceived} onChange={e => setForm({...form, dateReceived: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nama Nasabah *</Label>
                <Input data-testid="input-edit-case-customer" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Bergabung Nasabah</Label>
                <Input data-testid="input-edit-case-customer-join-date" type="date" value={form.customerJoinDate} onChange={e => setForm({...form, customerJoinDate: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>No. Akun</Label>
                <Input data-testid="input-edit-case-account" value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Akun Terkait</Label>
              <RelatedAccountsInput
                value={form.relatedAccounts}
                primaryAccount={form.accountNumber}
                primaryCustomerName={form.customerName}
                onChange={relatedAccounts => setForm(prev => ({...prev, relatedAccounts}))}
                testIdPrefix="input-edit-case"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cabang</Label>
                <Select value={form.branch || undefined} onValueChange={v => setForm({...form, branch: v})}>
                  <SelectTrigger data-testid="select-edit-case-branch">
                    <SelectValue placeholder={formBranchOptions.length ? "Pilih cabang" : "Belum ada cabang"} />
                  </SelectTrigger>
                  <SelectContent>
                    {formBranchNames.map(branch => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Marketing</Label>
                <Input data-testid="input-edit-case-pic" value={form.picMain} onChange={e => setForm({...form, picMain: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>WPB</Label>
                <Input data-testid="input-edit-case-wpb" placeholder="Nama WPB" value={form.wpbName} onChange={e => setForm({...form, wpbName: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Manager</Label>
                <Input data-testid="input-edit-case-manager" placeholder="Nama Manager" value={form.managerName} onChange={e => setForm({...form, managerName: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Kepala Cabang</Label>
                <Input data-testid="input-edit-case-branch-head" placeholder="Nama Kepala Cabang" value={form.branchHead} onChange={e => setForm({...form, branchHead: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Jalur Penyelesaian</Label>
              <Select value={form.resolutionPath} onValueChange={v => setForm({...form, resolutionPath: v})}>
                <SelectTrigger data-testid="select-edit-case-resolution"><SelectValue /></SelectTrigger>
                <SelectContent>{RESOLUTION_PATHS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Inti Pengaduan *</Label>
              <Textarea data-testid="input-edit-case-summary" value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label>Kronologi Pengaduan Nasabah</Label>
              <Textarea
                data-testid="input-edit-case-complaint-chronology"
                value={form.complaintChronology}
                onChange={e => setForm({...form, complaintChronology: e.target.value})}
              />
            </div>
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <Label className="font-medium">Dokumen Pengaduan Nasabah</Label>
              </div>
              <p className="text-xs text-muted-foreground">Format: PDF, JPG/JPEG, PNG, DOC/DOCX, XLS/XLSX. Maks 20MB per file.</p>
              <div className="space-y-3">
                {COMPLAINT_DOCUMENT_SECTIONS.map((section) => {
                  const currentMeta = complaintDocumentMeta[section.stage] || {};
                  const uploadStage = currentMeta.subStage ? `${section.stage} - ${currentMeta.subStage}` : section.stage;
                  const docs = complaintAttachments.map((doc, idx) => ({ ...doc, idx })).filter((doc) => doc.stage === section.stage || doc.stage.startsWith(`${section.stage} - `));
                  return (
                    <div key={`edit-complaint-${section.stage}`} className="rounded-md border p-2 space-y-2">
                      <p className="text-sm font-medium">{section.stage}</p>
                      <p className="text-xs text-muted-foreground">{section.note}</p>
                      {renderDocumentMetaFields(section, complaintDocumentMeta, setComplaintDocumentMeta)}
                      <Input
                        data-testid={`input-edit-case-complaint-document-upload-${section.stage}`}
                        type="file"
                        multiple
                        accept={CASE_DOCUMENT_ACCEPT}
                        onChange={async (e) => {
                          const input = e.currentTarget;
                          await handleComplaintAttachmentUpload(uploadStage, input.files, currentMeta);
                          input.value = "";
                        }}
                      />
                      {docs.map((doc) => (
                        <div key={`edit-complaint-${doc.fileName}-${doc.idx}`} className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{doc.fileName}</p>
                            <p className="truncate text-muted-foreground">{doc.stage}</p>
                            {documentMetaSummary(doc) && <p className="text-muted-foreground">{documentMetaSummary(doc)}</p>}
                          </div>
                          <DocumentFileActions doc={doc} onRemove={() => removeComplaintAttachment(doc.idx)} />
                        </div>
                      ))}
                    </div>
                  );
                })}
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
                  const stageDocs = caseDocuments
                    .map((doc, idx) => ({ ...doc, idx }))
                    .filter((doc) => doc.stage === stage);
                  return (
                    <div key={`edit-${stage}`} className="rounded-md border p-2 space-y-2">
                      <p className="text-sm font-medium">{stage}</p>
                      <p className="text-xs text-muted-foreground">{section.note}</p>
                      {renderDocumentMetaFields(section, caseDocumentMeta, setCaseDocumentMeta)}
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          data-testid={`input-edit-case-document-upload-${stage}`}
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
                            await handleCaseDocumentUpload(stage, input.files, caseDocumentMeta[stage] || {});
                            input.value = "";
                          }}
                        />
                      </div>
                      {stageDocs.length > 0 && (
                        <div className="space-y-1">
                          {stageDocs.map((doc) => (
                            <div key={`edit-${doc.fileName}-${doc.idx}`} className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs">
                              <div className="min-w-0">
                                <p className="truncate font-medium">{doc.fileName}</p>
                                <p className="truncate text-muted-foreground">{doc.stage}</p>
                                {documentMetaSummary(doc) && <p className="text-muted-foreground">{documentMetaSummary(doc)}</p>}
                              </div>
                              <DocumentFileActions doc={doc} onRemove={() => removeCaseDocument(doc.idx)} />
                            </div>
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
                <Label>Risk Level</Label>
                <Select value={form.riskLevel} onValueChange={v => setForm({...form, riskLevel: v})}>
                  <SelectTrigger data-testid="select-edit-case-risk"><SelectValue /></SelectTrigger>
                  <SelectContent>{RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger data-testid="select-edit-case-status"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Open", "In Progress", "Closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select value={form.workflowStage} onValueChange={v => setForm({...form, workflowStage: v})}>
                  <SelectTrigger data-testid="select-edit-case-stage"><SelectValue /></SelectTrigger>
                  <SelectContent>{WORKFLOW_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Bucket</Label>
                <Select value={form.bucket} onValueChange={v => setForm({...form, bucket: v})}>
                  <SelectTrigger data-testid="select-edit-case-bucket"><SelectValue /></SelectTrigger>
                  <SelectContent>{BUCKETS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Target</Label>
                <Input data-testid="input-edit-case-target" type="date" value={form.targetDate} onChange={e => setForm({...form, targetDate: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Progress (%)</Label>
              <Input data-testid="input-edit-case-progress" type="number" min={0} max={100} value={form.progress} onChange={e => setForm({...form, progress: parseInt(e.target.value) || 0})} />
            </div>
            <Button data-testid="button-submit-edit-case" onClick={handleEditSubmit} className="w-full" disabled={editMutation.isPending}>
              {editMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
