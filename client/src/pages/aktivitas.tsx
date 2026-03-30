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
import { StatusBadge } from "@/components/status-badges";
import { QueryError } from "@/components/query-error";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Calendar, ArrowRight, Trash2, Pencil, ArrowUpDown, BarChart3, Users, User, Clock, Hash } from "lucide-react";
import { DownloadMenu } from "@/components/download-menu";
import { DataPagination, usePagination } from "@/components/data-pagination";
import { usePageTitle } from "@/hooks/use-page-title";
import type { Activity, Company, MasterCategory } from "@shared/schema";

function autoDetectShift(): "Pagi" | "Siang" | "Malam" {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return "Pagi";
  if (hour >= 14 && hour < 22) return "Siang";
  return "Malam";
}

export default function AktivitasPage() {
  usePageTitle("Aktivitas");
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [dialogOpen, setDialogOpen] = useState(location.includes("action=new"));
  const [currentPage, setCurrentPage] = useState(1);
  const [personFilter, setPersonFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("hari");

  const isAdmin = ["superadmin", "owner"].includes(user?.role || "");

  const { data: activities, isLoading, isError, refetch } = useQuery<Activity[]>({ queryKey: ["/api/activities"] });
  const { data: companiesData } = useQuery<Company[]>({ queryKey: ["/api/companies"] });
  const { data: categories } = useQuery<MasterCategory[]>({ queryKey: ["/api/categories"] });
  const { data: usersData } = useQuery<any[]>({ queryKey: ["/api/users"] });

  const companyOrder = ["SGB", "RFB", "BPF", "KPF", "EWF"];
  const getCompanyCode = (companyId: number) => companiesData?.find(c => c.id === companyId)?.code || "";
  const duDkUsers = (usersData || [])
    .filter((u: any) => ["du", "dk"].includes(u.role) && u.isActive)
    .sort((a: any, b: any) => {
      const roleOrder = a.role === "du" ? 0 : 1;
      const roleOrderB = b.role === "du" ? 0 : 1;
      if (roleOrder !== roleOrderB) return roleOrder - roleOrderB;
      const compA = companyOrder.indexOf(getCompanyCode(a.companyId));
      const compB = companyOrder.indexOf(getCompanyCode(b.companyId));
      return (compA === -1 ? 99 : compA) - (compB === -1 ? 99 : compB);
    });

  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [form, setForm] = useState({
    title: "", description: "", date: new Date().toISOString().split("T")[0],
    categoryId: "", status: "Direncanakan", priority: "Medium",
    progress: 0, targetDate: "", nextAction: "", result: "", notes: "",
    companyId: user?.companyId?.toString() || "",
    quantity: 1, shift: autoDetectShift() as string,
    handoverFrom: "", pendingTasks: "", operationalCondition: "",
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
    quantity: 1, shift: autoDetectShift(),
    handoverFrom: "", pendingTasks: "", operationalCondition: "",
  });

  const handleSubmit = () => {
    if (!form.title || !form.date) {
      toast({ title: "Error", description: "Judul dan tanggal wajib diisi", variant: "destructive" });
      return;
    }
    if (!form.categoryId) {
      toast({ title: "Error", description: "Kategori wajib dipilih", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      ...form,
      categoryId: form.categoryId ? parseInt(form.categoryId) : null,
      companyId: form.companyId ? parseInt(form.companyId) : user?.companyId,
      progress: Number(form.progress),
      quantity: Number(form.quantity) || 1,
      shift: form.shift || null,
      handoverFrom: form.handoverFrom ? parseInt(form.handoverFrom) : null,
      pendingTasks: form.pendingTasks || null,
      operationalCondition: form.operationalCondition || null,
      targetDate: form.targetDate || null,
    });
  };

  const priorityOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

  const filtered = (activities?.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
      (a.description || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const matchCompany = companyFilter === "all" || a.companyId?.toString() === companyFilter;
    const matchPriority = priorityFilter === "all" || a.priority === priorityFilter;
    const matchPerson = personFilter === "all" || a.createdBy?.toString() === personFilter;
    return matchSearch && matchStatus && matchCompany && matchPriority && matchPerson;
  }) || []).sort((a, b) => {
    switch (sortBy) {
      case "date-asc": return a.date.localeCompare(b.date);
      case "date-desc": return b.date.localeCompare(a.date);
      case "progress-asc": return a.progress - b.progress;
      case "progress-desc": return b.progress - a.progress;
      case "priority-desc": return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      case "priority-asc": return (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
      default: return 0;
    }
  });

  const { totalPages, totalItems, getPageItems } = usePagination(filtered, 20);
  const pagedItems = getPageItems(currentPage);
  const getCompanyName = (id: number) => companiesData?.find(c => c.id === id)?.code || "-";
  const canCreate = ["du", "dk"].includes(user?.role || "");
  const canDelete = (a: Activity) => ["superadmin", "owner"].includes(user?.role || "") || a.createdBy === user?.id;
  const activityCategories = categories?.filter(c => c.type === "activity") || [];
  const isHandoverCategory = activityCategories.find(c => c.id.toString() === form.categoryId)?.name === "Handover Shift";

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/activities/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Berhasil", description: "Aktivitas berhasil dihapus" });
    },
    onError: (err: any) => { toast({ title: "Gagal", description: err.message || "Gagal menghapus", variant: "destructive" }); },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/activities/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Berhasil", description: "Aktivitas berhasil diperbarui" });
      setEditDialogOpen(false);
      setEditingActivity(null);
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal memperbarui aktivitas", variant: "destructive" });
    },
  });

  const openEditDialog = (a: Activity, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingActivity(a);
    setForm({
      title: a.title,
      description: a.description || "",
      date: a.date,
      categoryId: a.categoryId?.toString() || "",
      status: a.status,
      priority: a.priority,
      progress: a.progress,
      targetDate: a.targetDate || "",
      nextAction: a.nextAction || "",
      result: a.result || "",
      notes: a.notes || "",
      companyId: a.companyId?.toString() || "",
      quantity: (a as any).quantity || 1,
      shift: (a as any).shift || autoDetectShift(),
      handoverFrom: (a as any).handoverFrom?.toString() || "",
      pendingTasks: (a as any).pendingTasks || "",
      operationalCondition: (a as any).operationalCondition || "",
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editingActivity) return;
    if (!form.title || !form.date) {
      toast({ title: "Error", description: "Judul dan tanggal wajib diisi", variant: "destructive" });
      return;
    }
    editMutation.mutate({
      id: editingActivity.id,
      data: {
        title: form.title,
        description: form.description || null,
        date: form.date,
        categoryId: form.categoryId ? parseInt(form.categoryId) : null,
        status: form.status,
        priority: form.priority,
        progress: Number(form.progress),
        quantity: Number(form.quantity) || 1,
        shift: form.shift || null,
        handoverFrom: form.handoverFrom ? parseInt(form.handoverFrom) : null,
        pendingTasks: form.pendingTasks || null,
        operationalCondition: form.operationalCondition || null,
        targetDate: form.targetDate || null,
        nextAction: form.nextAction || null,
        result: form.result || null,
        notes: form.notes || null,
      },
    });
  };

  const canEdit = (a: Activity) => user?.role === "superadmin" || a.createdBy === user?.id;

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
              { header: "Jumlah", key: "_qty", width: 8 },
              { header: "Shift", key: "_shift", width: 8 },
              { header: "Status", key: "status", width: 15 },
              { header: "Prioritas", key: "priority", width: 10 },
              { header: "Progress", key: "_progress", width: 10 },
              { header: "Deskripsi", key: "description", width: 30 },
            ]}
            data={filtered.map(a => ({ ...a, _company: getCompanyName(a.companyId), _progress: `${a.progress}%`, _qty: (a as any).quantity || 1, _shift: (a as any).shift || "-" }))}
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
                  <Label>Kategori *</Label>
                  <Select value={form.categoryId} onValueChange={v => setForm({...form, categoryId: v})}>
                    <SelectTrigger data-testid="select-activity-category"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>{activityCategories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Jumlah *</Label>
                    <Input data-testid="input-activity-quantity" type="number" min={1} value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 1})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Shift</Label>
                    <Select value={form.shift} onValueChange={v => setForm({...form, shift: v})}>
                      <SelectTrigger data-testid="select-activity-shift"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pagi">Pagi (06:00-14:00)</SelectItem>
                        <SelectItem value="Siang">Siang (14:00-22:00)</SelectItem>
                        <SelectItem value="Malam">Malam (22:00-06:00)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {isHandoverCategory && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Diterima dari</Label>
                      <Select value={form.handoverFrom} onValueChange={v => setForm({...form, handoverFrom: v})}>
                        <SelectTrigger data-testid="select-handover-from"><SelectValue placeholder="Pilih user" /></SelectTrigger>
                        <SelectContent>
                          {(usersData || []).filter((u: any) => u.isActive && u.id !== user?.id).map((u: any) => (
                            <SelectItem key={u.id} value={u.id.toString()}>{u.fullName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Task Belum Selesai</Label>
                      <Textarea data-testid="input-pending-tasks" placeholder="Daftar pekerjaan yang belum selesai..." value={form.pendingTasks} onChange={e => setForm({...form, pendingTasks: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Kondisi Operasional</Label>
                      <Textarea data-testid="input-operational-condition" placeholder="Kondisi operasional saat handover..." value={form.operationalCondition} onChange={e => setForm({...form, operationalCondition: e.target.value})} />
                    </div>
                  </>
                )}
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

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input data-testid="input-search-activity" placeholder="Cari aktivitas..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-10" />
          </div>
          <Select value={sortBy} onValueChange={v => { setSortBy(v); setCurrentPage(1); }}>
            <SelectTrigger data-testid="select-sort-activity" className="w-48">
              <ArrowUpDown className="w-4 h-4 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Terbaru</SelectItem>
              <SelectItem value="date-asc">Terlama</SelectItem>
              <SelectItem value="priority-desc">Prioritas Tertinggi</SelectItem>
              <SelectItem value="priority-asc">Prioritas Terendah</SelectItem>
              <SelectItem value="progress-desc">Progress Tertinggi</SelectItem>
              <SelectItem value="progress-asc">Progress Terendah</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger data-testid="select-filter-status" className="w-44">
              <Filter className="w-4 h-4 mr-1" /><SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {isAdmin && (
          <Select value={companyFilter} onValueChange={v => { setCompanyFilter(v); setCurrentPage(1); }}>
            <SelectTrigger data-testid="select-filter-company" className="w-40">
              <SelectValue placeholder="Semua PT" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua PT</SelectItem>
              {companiesData?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.code}</SelectItem>)}
            </SelectContent>
          </Select>
          )}
          <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v); setCurrentPage(1); }}>
            <SelectTrigger data-testid="select-filter-priority" className="w-40">
              <SelectValue placeholder="Semua Prioritas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Prioritas</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && duDkUsers.length > 0 && (
            <Select value={personFilter} onValueChange={v => { setPersonFilter(v); setCurrentPage(1); }}>
              <SelectTrigger data-testid="select-filter-person" className="w-48">
                <User className="w-4 h-4 mr-1" /><SelectValue placeholder="Semua Personil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Personil</SelectItem>
                {duDkUsers.map((u: any) => (
                  <SelectItem key={u.id} value={u.id.toString()}>{u.fullName} ({u.role.toUpperCase()})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {isAdmin && !isLoading && activities && duDkUsers.length > 0 && (() => {
        const now = new Date();
        const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        const today = fmtDate(now);
        const ws = new Date(now); ws.setDate(ws.getDate() - ws.getDay());
        const weekStart = fmtDate(ws);
        const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
        const q = Math.floor(now.getMonth() / 3);
        const quarterStart = `${now.getFullYear()}-${String(q * 3 + 1).padStart(2,"0")}-01`;
        const yearStart = `${now.getFullYear()}-01-01`;

        const periodLabels: Record<string, string> = { hari: "Hari Ini", minggu: "Minggu Ini", bulan: "Bulan Ini", kuartal: `Q${q+1} ${now.getFullYear()}`, tahun: `Tahun ${now.getFullYear()}`, semua: "Semua Waktu" };
        const periodStart: Record<string, string | null> = { hari: today, minggu: weekStart, bulan: monthStart, kuartal: quarterStart, tahun: yearStart, semua: null };

        const prevPeriodLabels: Record<string, string> = { hari: "Minggu Ini", minggu: "Bulan Ini", bulan: "Kuartal Ini", kuartal: "Tahun Ini", tahun: "Semua", semua: "" };
        const prevPeriodStart: Record<string, string | null> = { hari: weekStart, minggu: monthStart, bulan: quarterStart, kuartal: yearStart, tahun: null, semua: null };

        const userStats = duDkUsers.map((u: any) => {
          const userActivities = activities.filter(a => a.createdBy === u.id);
          const pStart = periodStart[periodFilter];
          const periodActs = pStart ? userActivities.filter(a => a.date >= pStart) : userActivities;
          const periodCount = periodActs.length;
          const periodQty = periodActs.reduce((s, a) => s + ((a as any).quantity || 1), 0);
          const ppStart = prevPeriodStart[periodFilter];
          const prevCount = ppStart ? userActivities.filter(a => a.date >= ppStart).length : userActivities.length;
          const avgProgress = userActivities.length > 0 ? Math.round(userActivities.reduce((s, a) => s + a.progress, 0) / userActivities.length) : 0;
          const thresholdMap: Record<string, [number, number]> = { hari: [4, 2], minggu: [15, 8], bulan: [40, 20], kuartal: [100, 50], tahun: [300, 150], semua: [300, 150] };
          const [high, mid] = thresholdMap[periodFilter] || [4, 2];
          const beban = periodCount >= high ? "Padat" : periodCount >= mid ? "Normal" : "Ringan";
          const todayActs = userActivities.filter(a => a.date === today);
          const hasLoggedToday = todayActs.length > 0;
          return { ...u, periodCount, periodQty, prevCount, avgProgress, beban, total: userActivities.length, hasLoggedToday };
        });

        return (
          <Card data-testid="card-kesibukan-dudk">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="w-4 h-4 text-primary" />
                  <span>Kesibukan DU/DK</span>
                </div>
                <div className="flex flex-wrap gap-1 sm:ml-auto">
                  {(["hari", "minggu", "bulan", "kuartal", "tahun", "semua"] as const).map(p => (
                    <Button
                      key={p}
                      variant={periodFilter === p ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setPeriodFilter(p)}
                      data-testid={`button-period-${p}`}
                    >
                      {periodLabels[p]}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {userStats.map((u: any) => (
                  <div
                    key={u.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${personFilter === u.id.toString() ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
                    onClick={() => { setPersonFilter(u.id.toString()); setCurrentPage(1); setTimeout(() => document.getElementById("activity-list")?.scrollIntoView({ behavior: "smooth" }), 100); }}
                    data-testid={`card-person-${u.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{u.fullName}</p>
                          {u.hasLoggedToday ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Sudah log hari ini" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Belum log hari ini" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{u.role.toUpperCase()} {getCompanyCode(u.companyId) ? `- ${getCompanyCode(u.companyId)}` : ""}</p>
                      </div>
                      <Badge
                        variant={u.beban === "Padat" ? "destructive" : u.beban === "Normal" ? "default" : "secondary"}
                        className="text-[10px] flex-shrink-0"
                        data-testid={`badge-beban-${u.id}`}
                      >
                        {u.beban}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 text-xs">
                      <div className="text-center p-1.5 rounded bg-muted/50">
                        <p className="font-bold text-base">{u.periodCount}</p>
                        <p className="text-muted-foreground">{periodLabels[periodFilter]}</p>
                      </div>
                      <div className="text-center p-1.5 rounded bg-primary/10">
                        <p className="font-bold text-base">{u.periodQty}</p>
                        <p className="text-muted-foreground">Qty</p>
                      </div>
                      {periodFilter !== "semua" && (
                        <div className="text-center p-1.5 rounded bg-muted/50">
                          <p className="font-bold text-base">{u.prevCount}</p>
                          <p className="text-muted-foreground">{prevPeriodLabels[periodFilter]}</p>
                        </div>
                      )}
                      <div className="text-center p-1.5 rounded bg-muted/50">
                        <p className="font-bold text-base">{u.total}</p>
                        <p className="text-muted-foreground">Total</p>
                      </div>
                    </div>
                    {u.total > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={u.avgProgress} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground">{u.avgProgress}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {personFilter !== "all" && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setPersonFilter("all")} data-testid="button-clear-person-filter">
                  Tampilkan semua personil
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {!isLoading && !isError && activities && activities.length > 0 && (() => {
        const src = filtered;
        const total = src.length;
        const byStatus: Record<string, number> = {};
        const byPriority: Record<string, number> = {};
        src.forEach(a => {
          byStatus[a.status] = (byStatus[a.status] || 0) + 1;
          byPriority[a.priority] = (byPriority[a.priority] || 0) + 1;
        });
        const avgProgress = total > 0 ? Math.round(src.reduce((s, a) => s + a.progress, 0) / total) : 0;
        const totalQty = src.reduce((s, a) => s + ((a as any).quantity || 1), 0);
        return (
          <Card data-testid="card-activity-summary">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span>Ringkasan</span>
                <Badge variant="secondary" className="ml-1" data-testid="text-total-activities">{total} aktivitas</Badge>
                <Badge variant="outline" className="ml-1" data-testid="text-total-qty"><Hash className="w-3 h-3 mr-0.5" />{totalQty} qty</Badge>
                <Badge variant="outline" className="ml-1">Rata-rata progress: {avgProgress}%</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-medium text-muted-foreground mb-1.5">Status</p>
                  <div className="space-y-1">
                    {statuses.filter(s => byStatus[s]).map(s => (
                      <div key={s} className="flex items-center justify-between gap-2">
                        <span>{s}</span>
                        <span className="font-medium">{byStatus[s]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground mb-1.5">Prioritas</p>
                  <div className="space-y-1">
                    {["High", "Medium", "Low"].map(p => (
                      <div key={p} className="flex items-center justify-between">
                        <span className={p === "High" ? "text-red-600 dark:text-red-400 font-medium" : p === "Medium" ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}>{p}</span>
                        <span className="font-medium">{byPriority[p] || 0}</span>
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
        <QueryError message="Gagal memuat data aktivitas. Silakan coba lagi." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : filtered.length === 0 ? (
        <Card id="activity-list"><CardContent className="py-12 text-center space-y-2">
          {personFilter !== "all" ? (
            <>
              <p className="text-muted-foreground font-medium">{usersData?.find((u: any) => u.id.toString() === personFilter)?.fullName || "Personil ini"} belum ada aktivitas tercatat</p>
              <p className="text-sm text-muted-foreground">Belum ada kegiatan yang dicatat oleh personil ini</p>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">Belum ada aktivitas yang sesuai filter</p>
              {canCreate && <p className="text-sm text-muted-foreground">Klik <strong>"+ Tambah Aktivitas"</strong> di atas untuk mencatat kegiatan harian Anda</p>}
            </>
          )}
        </CardContent></Card>
      ) : (
        <div id="activity-list" className="space-y-3">
          {pagedItems.map(a => (
            <Card key={a.id} className="hover-elevate" data-testid={`card-activity-${a.id}`}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <Link href={`/aktivitas/${a.id}`} className="flex-1 min-w-0 space-y-1 cursor-pointer">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm">{a.title}</h3>
                      <StatusBadge status={a.status} />
                      {(a as any).quantity > 1 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0" data-testid={`badge-qty-${a.id}`}>
                          <Hash className="w-3 h-3 mr-0.5" />{(a as any).quantity}
                        </Badge>
                      )}
                      {(a as any).shift && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0" data-testid={`badge-shift-${a.id}`}>
                          <Clock className="w-3 h-3 mr-0.5" />{(a as any).shift}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{a.date}</span>
                      <span>{getCompanyName(a.companyId)}</span>
                      {isAdmin && usersData && (() => { const creator = usersData.find((u: any) => u.id === a.createdBy); return creator ? <span className="flex items-center gap-1"><User className="w-3 h-3" />{creator.fullName}</span> : null; })()}
                      {a.priority === "High" && <span className="text-red-500 font-medium">Prioritas Tinggi</span>}
                    </div>
                    {a.description && <p className="text-xs text-muted-foreground line-clamp-1">{a.description}</p>}
                  </Link>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-medium">{a.progress}%</p>
                      <Progress value={a.progress} className="h-1.5 w-20" />
                    </div>
                    {canEdit(a) && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" data-testid={`button-edit-activity-${a.id}`} onClick={e => openEditDialog(a, e)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
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
          <DataPagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={setCurrentPage} />
        </div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={(o) => { setEditDialogOpen(o); if (!o) { setEditingActivity(null); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Aktivitas</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tanggal *</Label>
                <Input data-testid="input-edit-activity-date" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger data-testid="select-edit-activity-status"><SelectValue /></SelectTrigger>
                  <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Judul *</Label>
              <Input data-testid="input-edit-activity-title" placeholder="Judul aktivitas" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label>Kategori *</Label>
              <Select value={form.categoryId} onValueChange={v => setForm({...form, categoryId: v})}>
                <SelectTrigger data-testid="select-edit-activity-category"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>{activityCategories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Jumlah</Label>
                <Input data-testid="input-edit-activity-quantity" type="number" min={1} value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 1})} />
              </div>
              <div className="space-y-1.5">
                <Label>Shift</Label>
                <Select value={form.shift} onValueChange={v => setForm({...form, shift: v})}>
                  <SelectTrigger data-testid="select-edit-activity-shift"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pagi">Pagi (06:00-14:00)</SelectItem>
                    <SelectItem value="Siang">Siang (14:00-22:00)</SelectItem>
                    <SelectItem value="Malam">Malam (22:00-06:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isHandoverCategory && (
              <>
                <div className="space-y-1.5">
                  <Label>Diterima dari</Label>
                  <Select value={form.handoverFrom} onValueChange={v => setForm({...form, handoverFrom: v})}>
                    <SelectTrigger data-testid="select-edit-handover-from"><SelectValue placeholder="Pilih user" /></SelectTrigger>
                    <SelectContent>
                      {(usersData || []).filter((u: any) => u.isActive && u.id !== user?.id).map((u: any) => (
                        <SelectItem key={u.id} value={u.id.toString()}>{u.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Task Belum Selesai</Label>
                  <Textarea data-testid="input-edit-pending-tasks" placeholder="Daftar pekerjaan yang belum selesai..." value={form.pendingTasks} onChange={e => setForm({...form, pendingTasks: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>Kondisi Operasional</Label>
                  <Textarea data-testid="input-edit-operational-condition" placeholder="Kondisi operasional saat handover..." value={form.operationalCondition} onChange={e => setForm({...form, operationalCondition: e.target.value})} />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Textarea data-testid="input-edit-activity-description" placeholder="Deskripsi singkat" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prioritas</Label>
                <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                  <SelectTrigger data-testid="select-edit-activity-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Progress (%)</Label>
                <Input data-testid="input-edit-activity-progress" type="number" min={0} max={100} value={form.progress} onChange={e => setForm({...form, progress: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Target Selesai</Label>
              <Input data-testid="input-edit-activity-target" type="date" value={form.targetDate} onChange={e => setForm({...form, targetDate: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label>Hasil / Perkembangan</Label>
              <Textarea data-testid="input-edit-activity-result" placeholder="Hasil aktivitas" value={form.result} onChange={e => setForm({...form, result: e.target.value})} />
            </div>
            <Button data-testid="button-submit-edit-activity" onClick={handleEditSubmit} className="w-full" disabled={editMutation.isPending}>
              {editMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
