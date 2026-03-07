import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth, getRoleLabel } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Search, Filter, Calendar, User, ArrowRight, Trash2 } from "lucide-react";
import { DownloadMenu } from "@/components/download-menu";
import type { Task, Company } from "@shared/schema";

const STATUSES = ["Baru", "Sedang Dikerjakan", "Menunggu Review", "Selesai", "Terlambat"];

export default function TugasPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { data: tasks, isLoading } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: companiesData } = useQuery<Company[]>({ queryKey: ["/api/companies"] });
  const { data: usersData } = useQuery<any[]>({ queryKey: ["/api/users"] });

  const [form, setForm] = useState({
    title: "", description: "", assignedTo: "", companyId: "",
    priority: "Medium", deadline: "", notes: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/tasks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Berhasil", description: "Tugas berhasil dibuat" });
      setDialogOpen(false);
      setForm({ title: "", description: "", assignedTo: "", companyId: "", priority: "Medium", deadline: "", notes: "" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal membuat tugas", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Berhasil", description: "Tugas diperbarui" });
      setSelectedTask(null);
    },
  });

  const handleSubmit = () => {
    if (!form.title || !form.assignedTo) {
      toast({ title: "Error", description: "Judul dan penerima tugas wajib diisi", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      ...form,
      assignedTo: parseInt(form.assignedTo),
      companyId: form.companyId ? parseInt(form.companyId) : null,
      deadline: form.deadline || null,
    });
  };

  const filtered = tasks?.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  }) || [];

  const getUserName = (id: number) => usersData?.find((u: any) => u.id === id)?.fullName || "Unknown";
  const getCompanyName = (id: number) => companiesData?.find(c => c.id === id)?.code || "-";
  const canCreate = ["superadmin", "owner"].includes(user?.role || "");
  const canDeleteTask = ["superadmin", "owner"].includes(user?.role || "");
  const assignableUsers = usersData?.filter((u: any) => ["du", "dk", "superadmin"].includes(u.role)) || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/tasks/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Berhasil", description: "Tugas berhasil dihapus" });
      setSelectedTask(null);
    },
    onError: (err: any) => { toast({ title: "Gagal", description: err.message || "Gagal menghapus", variant: "destructive" }); },
  });

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Tugas</h1>
          <p className="text-sm text-muted-foreground">Daftar tugas yang diberikan</p>
        </div>
        <div className="flex items-center gap-2">
          <DownloadMenu
            title="Laporan Tugas"
            filename="laporan_tugas"
            columns={[
              { header: "Judul", key: "title", width: 30 },
              { header: "Ditugaskan ke", key: "_assignee", width: 20 },
              { header: "PT", key: "_company", width: 10 },
              { header: "Status", key: "status", width: 15 },
              { header: "Prioritas", key: "priority", width: 10 },
              { header: "Progress", key: "_progress", width: 10 },
              { header: "Deadline", key: "deadline", width: 12 },
            ]}
            data={filtered.map(t => ({ ...t, _assignee: getUserName(t.assignedTo), _company: t.companyId ? getCompanyName(t.companyId) : "-", _progress: `${t.progress}%` }))}
          />
          {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-task"><Plus className="w-4 h-4 mr-1" /> Buat Tugas</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Buat Tugas Baru</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Judul Tugas *</Label>
                  <Input data-testid="input-task-title" placeholder="Judul tugas" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>Deskripsi</Label>
                  <Textarea data-testid="input-task-description" placeholder="Deskripsi tugas" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Ditugaskan kepada *</Label>
                    <Select value={form.assignedTo} onValueChange={v => setForm({...form, assignedTo: v})}>
                      <SelectTrigger data-testid="select-task-assignee"><SelectValue placeholder="Pilih penerima" /></SelectTrigger>
                      <SelectContent>
                        {assignableUsers.map((u: any) => (
                          <SelectItem key={u.id} value={u.id.toString()}>{u.fullName} ({getRoleLabel(u.role)})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>PT Terkait</Label>
                    <Select value={form.companyId} onValueChange={v => setForm({...form, companyId: v})}>
                      <SelectTrigger><SelectValue placeholder="Pilih PT" /></SelectTrigger>
                      <SelectContent>{companiesData?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.code}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Prioritas</Label>
                    <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Deadline</Label>
                    <Input data-testid="input-task-deadline" type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
                  </div>
                </div>
                <Button data-testid="button-submit-task" onClick={handleSubmit} className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Menyimpan..." : "Simpan Tugas"}
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
          <Input data-testid="input-search-task" placeholder="Cari tugas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><Filter className="w-4 h-4 mr-1" /><SelectValue placeholder="Semua Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Belum ada tugas</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <Card key={t.id} className="hover-elevate cursor-pointer" data-testid={`card-task-${t.id}`} onClick={() => setSelectedTask(t)}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm">{t.title}</h3>
                      <StatusBadge status={t.status} />
                      {t.priority === "High" && <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Prioritas Tinggi</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{getUserName(t.assignedTo)}</span>
                      {t.companyId && <span>{getCompanyName(t.companyId)}</span>}
                      {t.deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{t.deadline}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-medium">{t.progress}%</p>
                      <Progress value={t.progress} className="h-1.5 w-20" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{selectedTask.title}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={selectedTask.status} /></div>
                <div><p className="text-xs text-muted-foreground">Prioritas</p><p className="text-sm">{selectedTask.priority}</p></div>
                <div><p className="text-xs text-muted-foreground">Diberikan kepada</p><p className="text-sm">{getUserName(selectedTask.assignedTo)}</p></div>
                <div><p className="text-xs text-muted-foreground">Dibuat oleh</p><p className="text-sm">{getUserName(selectedTask.createdBy)}</p></div>
                {selectedTask.deadline && <div><p className="text-xs text-muted-foreground">Deadline</p><p className="text-sm">{selectedTask.deadline}</p></div>}
              </div>
              {selectedTask.description && <div><p className="text-xs text-muted-foreground mb-1">Deskripsi</p><p className="text-sm">{selectedTask.description}</p></div>}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Progress</p>
                <div className="flex items-center gap-3">
                  <Progress value={selectedTask.progress} className="h-2 flex-1" />
                  <span className="text-sm font-medium">{selectedTask.progress}%</span>
                </div>
              </div>
              {(user?.id === selectedTask.assignedTo || user?.role === "superadmin") && (
                <div className="p-3 bg-muted/50 rounded-md space-y-3">
                  <p className="text-sm font-medium">Update Status</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Select defaultValue={selectedTask.status} onValueChange={v => {
                      updateMutation.mutate({ id: selectedTask.id, data: { status: v } });
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" min={0} max={100} defaultValue={selectedTask.progress} placeholder="Progress %" onBlur={e => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val !== selectedTask.progress) {
                        updateMutation.mutate({ id: selectedTask.id, data: { progress: val } });
                      }
                    }} />
                  </div>
                </div>
              )}
              {canDeleteTask && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="w-full" data-testid={`button-delete-task-${selectedTask.id}`}>
                      <Trash2 className="w-4 h-4 mr-1" /> Hapus Tugas
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus Tugas?</AlertDialogTitle>
                      <AlertDialogDescription>Tugas "{selectedTask.title}" akan dihapus. Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(selectedTask.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid={`button-confirm-delete-task-${selectedTask.id}`}>Hapus</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
