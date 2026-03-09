import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
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
import { Plus, Search, Filter, ArrowRight, Trash2, Pencil, ArrowUpDown, FileWarning, AlertTriangle, Shield, BarChart3 } from "lucide-react";
import { DownloadMenu } from "@/components/download-menu";
import { DataPagination, usePagination } from "@/components/data-pagination";
import { usePageTitle } from "@/hooks/use-page-title";
import type { Case, Company, Branch } from "@shared/schema";

const BUCKETS = [
  "Pemeriksaan Pengaduan Baru", "Disetujui untuk Perdamaian", "Tidak Disetujui untuk Perdamaian",
  "Menunggu Pemeriksaan", "Proses Negosiasi / Mediasi", "Proses Regulator", "Deadlock", "Closed",
];
const RISK_LEVELS = ["Low", "Medium", "High"];
const WORKFLOW_STAGES = ["Open", "Pemeriksaan Internal", "Review", "Negosiasi", "Proses Regulator", "Settlement / Deadlock", "Closed"];
const RESOLUTION_PATHS = ["Belum Ditentukan", "Mediasi Internal", "Mediasi BBJ", "Sidang Bappebti", "BAKTI", "Pengadilan", "Kepolisian"];

export default function KasusPage() {
  usePageTitle("Kasus Pengaduan");
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [bucketFilter, setBucketFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [dialogOpen, setDialogOpen] = useState(location.includes("action=new"));
  const [currentPage, setCurrentPage] = useState(1);

  const { data: cases, isLoading, isError, refetch } = useQuery<Case[]>({ queryKey: ["/api/cases"] });
  const { data: companiesData } = useQuery<Company[]>({ queryKey: ["/api/companies"] });

  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [branchFilter, setBranchFilter] = useState("all");
  const [resolutionFilter, setResolutionFilter] = useState("all");
  const isDuDk = ["du", "dk"].includes(user?.role || "");
  const isAdmin = ["superadmin", "owner"].includes(user?.role || "");

  const { data: myBranches } = useQuery<Branch[]>({
    queryKey: ["/api/branches/my-company"],
    enabled: isDuDk,
  });

  const [form, setForm] = useState({
    caseCode: "", branch: "", dateReceived: new Date().toISOString().split("T")[0],
    customerName: "", accountNumber: "", picMain: "", bucket: "Pemeriksaan Pengaduan Baru",
    status: "Open", summary: "", riskLevel: "Medium", priority: "Medium",
    workflowStage: "Open", progress: 0, targetDate: "",
    companyId: user?.companyId?.toString() || "",
    wpbName: "", managerName: "", resolutionPath: "Belum Ditentukan",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/cases", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Berhasil", description: "Kasus berhasil dibuat" });
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
      branch: form.branch || null,
      picMain: form.picMain || null,
      wpbName: form.wpbName || null,
      managerName: form.managerName || null,
      resolutionPath: form.resolutionPath,
    });
  };

  const riskOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

  const filtered = (cases?.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = c.caseCode.toLowerCase().includes(s) ||
      c.customerName.toLowerCase().includes(s) ||
      (c.summary || "").toLowerCase().includes(s) ||
      (c.accountNumber || "").toLowerCase().includes(s);
    const matchRisk = riskFilter === "all" || c.riskLevel === riskFilter;
    const matchCompany = companyFilter === "all" || c.companyId?.toString() === companyFilter;
    const matchBucket = bucketFilter === "all" || c.bucket === bucketFilter;
    const matchStage = stageFilter === "all" || c.workflowStage === stageFilter;
    const matchBranch = branchFilter === "all" || c.branch === branchFilter;
    const matchResolution = resolutionFilter === "all" || c.resolutionPath === resolutionFilter;
    return matchSearch && matchRisk && matchCompany && matchBucket && matchStage && matchBranch && matchResolution;
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
  const canCreate = ["du", "dk"].includes(user?.role || "");
  const canDeleteCase = (c: Case) => ["superadmin", "owner"].includes(user?.role || "") || c.createdBy === user?.id;

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

  const resetForm = () => setForm({
    caseCode: "", branch: "", dateReceived: new Date().toISOString().split("T")[0],
    customerName: "", accountNumber: "", picMain: "", bucket: "Pemeriksaan Pengaduan Baru",
    status: "Open", summary: "", riskLevel: "Medium", priority: "Medium",
    workflowStage: "Open", progress: 0, targetDate: "",
    companyId: user?.companyId?.toString() || "",
    wpbName: "", managerName: "", resolutionPath: "Belum Ditentukan",
  });

  const openEditDialog = (c: Case, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingCase(c);
    setForm({
      caseCode: c.caseCode,
      branch: c.branch || "",
      dateReceived: c.dateReceived,
      customerName: c.customerName,
      accountNumber: c.accountNumber || "",
      picMain: c.picMain || "",
      bucket: c.bucket,
      status: c.status,
      summary: c.summary,
      riskLevel: c.riskLevel,
      priority: c.priority,
      workflowStage: c.workflowStage,
      progress: c.progress,
      targetDate: c.targetDate || "",
      companyId: c.companyId?.toString() || "",
      wpbName: c.wpbName || "",
      managerName: c.managerName || "",
      resolutionPath: c.resolutionPath || "Belum Ditentukan",
    });
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
        summary: form.summary,
        branch: form.branch || null,
        dateReceived: form.dateReceived,
        accountNumber: form.accountNumber || null,
        picMain: form.picMain || null,
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
      },
    });
  };

  const canEditCase = (c: Case) => user?.role === "superadmin" || c.createdBy === user?.id;

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Kasus Pengaduan</h1>
          <p className="text-sm text-muted-foreground">Daftar kasus pengaduan yang tercatat</p>
        </div>
        <div className="flex items-center gap-2">
          <DownloadMenu
            title="Laporan Kasus Pengaduan"
            filename="laporan_kasus"
            columns={[
              { header: "Kode Kasus", key: "caseCode", width: 15 },
              { header: "Nasabah", key: "customerName", width: 20 },
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-case"><Plus className="w-4 h-4 mr-1" /> Tambah Kasus</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Tambah Kasus Baru</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Kode Kasus *</Label>
                    <Input data-testid="input-case-code" placeholder="SGF-2024-003" value={form.caseCode} onChange={e => setForm({...form, caseCode: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tanggal Masuk *</Label>
                    <Input data-testid="input-case-date" type="date" value={form.dateReceived} onChange={e => setForm({...form, dateReceived: e.target.value})} />
                  </div>
                </div>
                {["superadmin", "owner"].includes(user?.role || "") && (
                  <div className="space-y-1.5">
                    <Label>PT</Label>
                    <Select value={form.companyId} onValueChange={v => setForm({...form, companyId: v})}>
                      <SelectTrigger><SelectValue placeholder="Pilih PT" /></SelectTrigger>
                      <SelectContent>{companiesData?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.code}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Nama Nasabah *</Label>
                    <Input data-testid="input-case-customer" placeholder="Nama nasabah" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>No. Akun</Label>
                    <Input data-testid="input-case-account" placeholder="Nomor akun" value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Cabang</Label>
                    <Input data-testid="input-case-branch" placeholder="Cabang" value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>PIC Utama</Label>
                    <Input data-testid="input-case-pic" placeholder="PIC" value={form.picMain} onChange={e => setForm({...form, picMain: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>WPB</Label>
                    <Input data-testid="input-case-wpb" placeholder="Nama WPB" value={form.wpbName} onChange={e => setForm({...form, wpbName: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Manager</Label>
                    <Input data-testid="input-case-manager" placeholder="Nama Manager" value={form.managerName} onChange={e => setForm({...form, managerName: e.target.value})} />
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
                  <Textarea data-testid="input-case-summary" placeholder="Ringkasan pengaduan" value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} />
                </div>
                <div className="grid grid-cols-3 gap-3">
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

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input data-testid="input-search-case" placeholder="Cari kode kasus, no. akun, nasabah, atau ringkasan..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-10" />
          </div>
          <Select value={sortBy} onValueChange={v => { setSortBy(v); setCurrentPage(1); }}>
            <SelectTrigger data-testid="select-sort-case" className="w-48">
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
        <div className="flex flex-wrap gap-2">
          <Select value={riskFilter} onValueChange={v => { setRiskFilter(v); setCurrentPage(1); }}>
            <SelectTrigger data-testid="select-filter-risk" className="w-40">
              <Filter className="w-4 h-4 mr-1" /><SelectValue placeholder="Semua Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Risk</SelectItem>
              {RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Select value={companyFilter} onValueChange={v => { setCompanyFilter(v); setCurrentPage(1); }}>
              <SelectTrigger data-testid="select-filter-company-case" className="w-40">
                <SelectValue placeholder="Semua PT" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua PT</SelectItem>
                {companiesData?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.code}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {isDuDk && myBranches && myBranches.length > 0 && (
            <Select value={branchFilter} onValueChange={v => { setBranchFilter(v); setCurrentPage(1); }}>
              <SelectTrigger data-testid="select-filter-branch-case" className="w-40">
                <SelectValue placeholder="Semua Cabang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Cabang</SelectItem>
                {myBranches.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={bucketFilter} onValueChange={v => { setBucketFilter(v); setCurrentPage(1); }}>
            <SelectTrigger data-testid="select-filter-bucket" className="w-52">
              <SelectValue placeholder="Semua Bucket" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bucket</SelectItem>
              {BUCKETS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={stageFilter} onValueChange={v => { setStageFilter(v); setCurrentPage(1); }}>
            <SelectTrigger data-testid="select-filter-stage" className="w-44">
              <SelectValue placeholder="Semua Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Stage</SelectItem>
              {WORKFLOW_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={resolutionFilter} onValueChange={v => { setResolutionFilter(v); setCurrentPage(1); }}>
            <SelectTrigger data-testid="select-filter-resolution" className="w-48">
              <SelectValue placeholder="Semua Jalur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jalur</SelectItem>
              {RESOLUTION_PATHS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isLoading && !isError && cases && cases.length > 0 && (() => {
        const src = filtered;
        const total = src.length;
        const byRisk = { High: 0, Medium: 0, Low: 0 } as Record<string, number>;
        const byBucket: Record<string, number> = {};
        const byStage: Record<string, number> = {};
        const byResolution: Record<string, number> = {};
        src.forEach(c => {
          byRisk[c.riskLevel] = (byRisk[c.riskLevel] || 0) + 1;
          byBucket[c.bucket] = (byBucket[c.bucket] || 0) + 1;
          byStage[c.workflowStage] = (byStage[c.workflowStage] || 0) + 1;
          byResolution[c.resolutionPath || "Belum Ditentukan"] = (byResolution[c.resolutionPath || "Belum Ditentukan"] || 0) + 1;
        });
        return (
          <Card data-testid="card-case-summary">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span>Ringkasan</span>
                <Badge variant="secondary" className="ml-1" data-testid="text-total-cases">{total} kasus</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Risk Level</p>
                  <div className="space-y-1">
                    {["High", "Medium", "Low"].map(r => (
                      <div key={r} className="flex items-center justify-between">
                        <span className={r === "High" ? "text-red-600 dark:text-red-400 font-medium" : r === "Medium" ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}>{r}</span>
                        <span className="font-medium">{byRisk[r] || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><FileWarning className="w-3 h-3" /> Bucket</p>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {Object.entries(byBucket).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-2">
                        <span className="truncate">{k}</span>
                        <span className="font-medium flex-shrink-0">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Shield className="w-3 h-3" /> Stage</p>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {Object.entries(byStage).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-2">
                        <span className="truncate">{k}</span>
                        <span className="font-medium flex-shrink-0">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Shield className="w-3 h-3" /> Jalur</p>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {Object.entries(byResolution).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-2">
                        <span className="truncate">{k}</span>
                        <span className="font-medium flex-shrink-0">{v}</span>
                      </div>
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
                      <span className="font-semibold text-sm text-primary" data-testid={`text-account-${c.id}`}>No. Akun: {c.accountNumber || "-"}</span>
                      <span className="text-xs text-muted-foreground">{c.caseCode}</span>
                      <RiskBadge level={c.riskLevel} />
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-sm">{c.customerName}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{c.summary}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>{getCompanyName(c.companyId)}</span>
                      {c.branch && <span>{c.branch}</span>}
                      <span>{c.workflowStage}</span>
                      {c.resolutionPath && c.resolutionPath !== "Belum Ditentukan" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0" data-testid={`badge-resolution-${c.id}`}>{c.resolutionPath}</Badge>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-medium">{c.progress}%</p>
                      <Progress value={c.progress} className="h-1.5 w-20" />
                    </div>
                    {canEditCase(c) && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" data-testid={`button-edit-case-${c.id}`} onClick={e => openEditDialog(c, e)}>
                        <Pencil className="w-4 h-4" />
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
                    <Link href={`/kasus/${c.id}`}><ArrowRight className="w-4 h-4 text-muted-foreground" /></Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <DataPagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={setCurrentPage} />
        </div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={(o) => { setEditDialogOpen(o); if (!o) { setEditingCase(null); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Kasus</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kode Kasus *</Label>
                <Input data-testid="input-edit-case-code" value={form.caseCode} onChange={e => setForm({...form, caseCode: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Masuk</Label>
                <Input data-testid="input-edit-case-date" type="date" value={form.dateReceived} onChange={e => setForm({...form, dateReceived: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nama Nasabah *</Label>
                <Input data-testid="input-edit-case-customer" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>No. Akun</Label>
                <Input data-testid="input-edit-case-account" value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cabang</Label>
                <Input data-testid="input-edit-case-branch" value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>PIC Utama</Label>
                <Input data-testid="input-edit-case-pic" value={form.picMain} onChange={e => setForm({...form, picMain: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>WPB</Label>
                <Input data-testid="input-edit-case-wpb" placeholder="Nama WPB" value={form.wpbName} onChange={e => setForm({...form, wpbName: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Manager</Label>
                <Input data-testid="input-edit-case-manager" placeholder="Nama Manager" value={form.managerName} onChange={e => setForm({...form, managerName: e.target.value})} />
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
            <div className="grid grid-cols-3 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
