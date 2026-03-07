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
import { Plus, Search, Filter, ArrowRight, Trash2, Pencil, ArrowUpDown } from "lucide-react";
import { DownloadMenu } from "@/components/download-menu";
import { DataPagination, usePagination } from "@/components/data-pagination";
import { usePageTitle } from "@/hooks/use-page-title";
import type { Case, Company } from "@shared/schema";

const BUCKETS = [
  "Pemeriksaan Pengaduan Baru", "Disetujui untuk Perdamaian", "Tidak Disetujui untuk Perdamaian",
  "Menunggu Pemeriksaan", "Proses Negosiasi / Mediasi", "Proses Regulator", "Deadlock", "Closed",
];
const RISK_LEVELS = ["Low", "Medium", "High"];
const WORKFLOW_STAGES = ["Open", "Pemeriksaan Internal", "Review", "Negosiasi", "Proses Regulator", "Settlement / Deadlock", "Closed"];

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

  const [form, setForm] = useState({
    caseCode: "", branch: "", dateReceived: new Date().toISOString().split("T")[0],
    customerName: "", accountNumber: "", picMain: "", bucket: "Pemeriksaan Pengaduan Baru",
    status: "Open", summary: "", riskLevel: "Medium", priority: "Medium",
    workflowStage: "Open", progress: 0, targetDate: "",
    companyId: user?.companyId?.toString() || "",
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
    });
  };

  const riskOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

  const filtered = (cases?.filter(c => {
    const matchSearch = c.caseCode.toLowerCase().includes(search.toLowerCase()) ||
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (c.summary || "").toLowerCase().includes(search.toLowerCase());
    const matchRisk = riskFilter === "all" || c.riskLevel === riskFilter;
    const matchCompany = companyFilter === "all" || c.companyId?.toString() === companyFilter;
    const matchBucket = bucketFilter === "all" || c.bucket === bucketFilter;
    const matchStage = stageFilter === "all" || c.workflowStage === stageFilter;
    return matchSearch && matchRisk && matchCompany && matchBucket && matchStage;
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
  const canCreate = ["superadmin", "du", "dk"].includes(user?.role || "");
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
            <Input data-testid="input-search-case" placeholder="Cari kode kasus, nasabah, atau ringkasan..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-10" />
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
          <Select value={companyFilter} onValueChange={v => { setCompanyFilter(v); setCurrentPage(1); }}>
            <SelectTrigger data-testid="select-filter-company-case" className="w-40">
              <SelectValue placeholder="Semua PT" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua PT</SelectItem>
              {companiesData?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.code}</SelectItem>)}
            </SelectContent>
          </Select>
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
        </div>
      </div>

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
                      <h3 className="font-medium text-sm">{c.caseCode}</h3>
                      <RiskBadge level={c.riskLevel} />
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-sm">{c.customerName}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{c.summary}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>{getCompanyName(c.companyId)}</span>
                      {c.branch && <span>{c.branch}</span>}
                      <span>{c.workflowStage}</span>
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
                  <SelectContent>{WORKFLOW_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
