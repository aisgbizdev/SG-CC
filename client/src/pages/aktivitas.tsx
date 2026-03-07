import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "./dashboard";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Filter, Calendar, ArrowRight, Trash2 } from "lucide-react";
import { DownloadMenu } from "@/components/download-menu";
import type { Activity, Company, MasterCategory } from "@shared/schema";

export default function AktivitasPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(location.includes("action=new"));

  const { data: activities, isLoading } = useQuery<Activity[]>({ queryKey: ["/api/activities"] });
  const { data: companiesData } = useQuery<Company[]>({ queryKey: ["/api/companies"] });
  const { data: categories } = useQuery<MasterCategory[]>({ queryKey: ["/api/categories"] });

  const [form, setForm] = useState({
    title: "", description: "", date: new Date().toISOString().split("T")[0],
    categoryId: "", status: "Direncanakan", priority: "Medium",
    progress: 0, targetDate: "", nextAction: "", result: "", notes: "",
    companyId: user?.companyId?.toString() || "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/activities", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Berhasil", description: "Aktivitas berhasil dibuat" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal membuat aktivitas", variant: "destructive" });
    },
  });

  const resetForm = () => setForm({
    title: "", description: "", date: new Date().toISOString().split("T")[0],
    categoryId: "", status: "Direncanakan", priority: "Medium",
    progress: 0, targetDate: "", nextAction: "", result: "", notes: "",
    companyId: user?.companyId?.toString() || "",
  });

  const handleSubmit = () => {
    if (!form.title || !form.date) {
      toast({ title: "Error", description: "Judul dan tanggal wajib diisi", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      ...form,
      categoryId: form.categoryId ? parseInt(form.categoryId) : null,
      companyId: form.companyId ? parseInt(form.companyId) : user?.companyId,
      progress: Number(form.progress),
      targetDate: form.targetDate || null,
    });
  };

  const filtered = activities?.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  }) || [];

  const getCompanyName = (id: number) => companiesData?.find(c => c.id === id)?.code || "-";
  const canCreate = ["superadmin", "du", "dk"].includes(user?.role || "");
  const canDelete = (a: Activity) => ["superadmin", "owner"].includes(user?.role || "") || a.createdBy === user?.id;
  const activityCategories = categories?.filter(c => c.type === "activity") || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/activities/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Berhasil", description: "Aktivitas berhasil dihapus" });
    },
    onError: (err: any) => { toast({ title: "Gagal", description: err.message || "Gagal menghapus", variant: "destructive" }); },
  });

  const statuses = ["Direncanakan", "Sedang Dikerjakan", "Menunggu Review", "Selesai", "Tertunda", "Overdue"];

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Aktivitas</h1>
          <p className="text-sm text-muted-foreground">Daftar aktivitas penting yang tercatat</p>
        </div>
        <div className="flex items-center gap-2">
          <DownloadMenu
            title="Laporan Aktivitas"
            filename="laporan_aktivitas"
            columns={[
              { header: "Tanggal", key: "date", width: 12 },
              { header: "Judul", key: "title", width: 30 },
              { header: "PT", key: "_company", width: 10 },
              { header: "Status", key: "status", width: 15 },
              { header: "Prioritas", key: "priority", width: 10 },
              { header: "Progress", key: "_progress", width: 10 },
              { header: "Deskripsi", key: "description", width: 30 },
            ]}
            data={filtered.map(a => ({ ...a, _company: getCompanyName(a.companyId), _progress: `${a.progress}%` }))}
          />
          {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-activity"><Plus className="w-4 h-4 mr-1" /> Tambah Aktivitas</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Tambah Aktivitas Baru</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tanggal *</Label>
                    <Input data-testid="input-activity-date" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  </div>
                  {["superadmin", "owner"].includes(user?.role || "") && (
                    <div className="space-y-1.5">
                      <Label>PT</Label>
                      <Select value={form.companyId} onValueChange={v => setForm({...form, companyId: v})}>
                        <SelectTrigger data-testid="select-activity-company"><SelectValue placeholder="Pilih PT" /></SelectTrigger>
                        <SelectContent>{companiesData?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.code}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Judul *</Label>
                  <Input data-testid="input-activity-title" placeholder="Judul aktivitas" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>Kategori</Label>
                  <Select value={form.categoryId} onValueChange={v => setForm({...form, categoryId: v})}>
                    <SelectTrigger data-testid="select-activity-category"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>{activityCategories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Deskripsi</Label>
                  <Textarea data-testid="input-activity-description" placeholder="Deskripsi singkat" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                      <SelectTrigger data-testid="select-activity-status"><SelectValue /></SelectTrigger>
                      <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Prioritas</Label>
                    <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                      <SelectTrigger data-testid="select-activity-priority"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Progress (%)</Label>
                    <Input data-testid="input-activity-progress" type="number" min={0} max={100} value={form.progress} onChange={e => setForm({...form, progress: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Target Selesai</Label>
                    <Input data-testid="input-activity-target" type="date" value={form.targetDate} onChange={e => setForm({...form, targetDate: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Hasil / Perkembangan</Label>
                  <Textarea data-testid="input-activity-result" placeholder="Hasil aktivitas" value={form.result} onChange={e => setForm({...form, result: e.target.value})} />
                </div>
                <Button data-testid="button-submit-activity" onClick={handleSubmit} className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Menyimpan..." : "Simpan Aktivitas"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input data-testid="input-search-activity" placeholder="Cari aktivitas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger data-testid="select-filter-status" className="w-48">
            <Filter className="w-4 h-4 mr-1" /><SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Belum ada aktivitas yang sesuai filter</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <Card key={a.id} className="hover-elevate" data-testid={`card-activity-${a.id}`}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <Link href={`/aktivitas/${a.id}`} className="flex-1 min-w-0 space-y-1 cursor-pointer">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm">{a.title}</h3>
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{a.date}</span>
                      <span>{getCompanyName(a.companyId)}</span>
                      {a.priority === "High" && <span className="text-red-500 font-medium">Prioritas Tinggi</span>}
                    </div>
                    {a.description && <p className="text-xs text-muted-foreground line-clamp-1">{a.description}</p>}
                  </Link>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-medium">{a.progress}%</p>
                      <Progress value={a.progress} className="h-1.5 w-20" />
                    </div>
                    {canDelete(a) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" data-testid={`button-delete-activity-${a.id}`} onClick={e => e.stopPropagation()}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Aktivitas?</AlertDialogTitle>
                            <AlertDialogDescription>Aktivitas "{a.title}" akan dihapus. Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(a.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid={`button-confirm-delete-activity-${a.id}`}>Hapus</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <Link href={`/aktivitas/${a.id}`}><ArrowRight className="w-4 h-4 text-muted-foreground" /></Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
