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
import { StatusBadge, RiskBadge } from "./dashboard";
import { Plus, Search, Filter, ArrowRight } from "lucide-react";
import type { Case, Company } from "@shared/schema";

const BUCKETS = [
  "Pemeriksaan Pengaduan Baru", "Disetujui untuk Perdamaian", "Tidak Disetujui untuk Perdamaian",
  "Menunggu Pemeriksaan", "Proses Negosiasi / Mediasi", "Proses Regulator", "Deadlock", "Closed",
];
const RISK_LEVELS = ["Low", "Medium", "High"];
const WORKFLOW_STAGES = ["Open", "Pemeriksaan Internal", "Review", "Negosiasi", "Proses Regulator", "Settlement / Deadlock", "Closed"];

export default function KasusPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(location.includes("action=new"));

  const { data: cases, isLoading } = useQuery<Case[]>({ queryKey: ["/api/cases"] });
  const { data: companiesData } = useQuery<Company[]>({ queryKey: ["/api/companies"] });

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

  const filtered = cases?.filter(c => {
    const matchSearch = c.caseCode.toLowerCase().includes(search.toLowerCase()) ||
      c.customerName.toLowerCase().includes(search.toLowerCase());
    const matchRisk = riskFilter === "all" || c.riskLevel === riskFilter;
    return matchSearch && matchRisk;
  }) || [];

  const getCompanyName = (id: number) => companiesData?.find(c => c.id === id)?.code || "-";
  const canCreate = ["superadmin", "du", "dk"].includes(user?.role || "");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Kasus Pengaduan</h1>
          <p className="text-sm text-muted-foreground">Daftar kasus pengaduan yang tercatat</p>
        </div>
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input data-testid="input-search-case" placeholder="Cari kode kasus atau nama nasabah..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger data-testid="select-filter-risk" className="w-48">
            <Filter className="w-4 h-4 mr-1" /><SelectValue placeholder="Semua Risk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Risk Level</SelectItem>
            {RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Belum ada kasus yang sesuai filter</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <Link key={c.id} href={`/kasus/${c.id}`}>
              <Card className="hover-elevate cursor-pointer" data-testid={`card-case-${c.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
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
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-medium">{c.progress}%</p>
                        <Progress value={c.progress} className="h-1.5 w-20" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
