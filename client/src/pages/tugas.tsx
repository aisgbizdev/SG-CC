import { useState, useEffect } from "react";
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
import { StatusBadge } from "@/components/status-badges";
import { QueryError } from "@/components/query-error";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Calendar, User, ArrowRight, Trash2, ArrowUpDown, Pencil, X, BarChart3, Check } from "lucide-react";
import { DownloadMenu } from "@/components/download-menu";
import { DataPagination, usePagination } from "@/components/data-pagination";
import { usePageTitle } from "@/hooks/use-page-title";
import type { Task, Company } from "@shared/schema";

const STATUSES = ["Baru", "Sedang Dikerjakan", "Menunggu Review", "Selesai", "Terlambat"];

export default function TugasPage() {
  usePageTitle("Tugas");
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("deadline-desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (selectedTask) {
      apiRequest("POST", "/api/read-receipts", { entityType: "task", entityId: selectedTask.id }).catch(() => {});
    }
  }, [selectedTask?.id]);
  const [editForm, setEditForm] = useState({ title: "", description: "", assignedTo: "", companyId: "", priority: "Medium", deadline: "", notes: "" });
  const [currentPage, setCurrentPage] = useState(1);

  const { data: tasks, isLoading, isError, refetch } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: companiesData } = useQuery<Company[]>({ queryKey: ["/api/companies"] });
  const { data: usersData } = useQuery<any[]>({ queryKey: ["/api/users"] });

  const [form, setForm] = useState({
    title: "", description: "", selectedAssignees: [] as string[], companyId: "",
    priority: "Medium", deadline: "", notes: "",
  });
  const [isSending, setIsSending] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, data);
      return res.json();
    },
    onSuccess: (updatedTask: Task) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Berhasil", description: "Tugas diperbarui" });
      if (editMode) {
        setSelectedTask(updatedTask);
        setEditMode(false);
      } else {
        setSelectedTask(null);
      }
    },
  });

  const handleSubmit = async () => {
    if (!form.title || form.selectedAssignees.length === 0) {
      toast({ title: "Error", description: "Judul dan penerima tugas wajib diisi", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      const results = await Promise.allSettled(
        form.selectedAssignees.map(uid =>
          apiRequest("POST", "/api/tasks", {
            title: form.title,
            description: form.description,
            assignedTo: parseInt(uid),
            companyId: form.companyId ? parseInt(form.companyId) : null,
            priority: form.priority,
            deadline: form.deadline || null,
            notes: form.notes,
          })
        )
      );
      const successIds: string[] = [];
      const failedIds: string[] = [];
      form.selectedAssignees.forEach((uid, i) => {
        if (results[i].status === "fulfilled") successIds.push(uid);
        else failedIds.push(uid);
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (failedIds.length === 0) {
        toast({ title: "Berhasil", description: `${successIds.length} tugas berhasil dibuat` });
        setDialogOpen(false);
        setForm({ title: "", description: "", selectedAssignees: [], companyId: "", priority: "Medium", deadline: "", notes: "" });
      } else {
        toast({ title: "Sebagian Berhasil", description: `${successIds.length} berhasil, ${failedIds.length} gagal`, variant: "destructive" });
        setForm(prev => ({ ...prev, selectedAssignees: failedIds }));
      }
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message || "Gagal membuat tugas", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const toggleAssignee = (uid: string) => {
    setForm(prev => ({
      ...prev,
      selectedAssignees: prev.selectedAssignees.includes(uid)
        ? prev.selectedAssignees.filter(id => id !== uid)
        : [...prev.selectedAssignees, uid],
    }));
  };

  const toggleSelectAllAssignees = () => {
    const allIds = assignableUsers.map((u: any) => u.id.toString());
    setForm(prev => ({
      ...prev,
      selectedAssignees: prev.selectedAssignees.length === allIds.length ? [] : allIds,
    }));
  };

  const priorityOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

  const filtered = (tasks?.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
    const matchAssignee = assigneeFilter === "all" || t.assignedTo?.toString() === assigneeFilter;
    return matchSearch && matchStatus && matchPriority && matchAssignee;
  }) || []).sort((a, b) => {
    switch (sortBy) {
      case "deadline-desc":
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return b.deadline.localeCompare(a.deadline);
      case "deadline-asc":
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      case "progress-asc": return a.progress - b.progress;
      case "progress-desc": return b.progress - a.progress;
      case "priority-desc": return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      case "priority-asc": return (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
      default: return 0;
    }
  });

  const { totalPages, totalItems, getPageItems } = usePagination(filtered, 20);
  const pagedItems = getPageItems(currentPage);
  const getUserName = (id: number) => usersData?.find((u: any) => u.id === id)?.fullName || "Unknown";
  const getCompanyName = (id: number) => companiesData?.find(c => c.id === id)?.code || "-";
  const canCreate = ["superadmin", "owner"].includes(user?.role || "");
  const canDeleteTask = ["superadmin", "owner"].includes(user?.role || "");
  const canEditTask = ["superadmin", "owner"].includes(user?.role || "");
  const assignableUsers = usersData?.filter((u: any) => ["du", "dk", "superadmin"].includes(u.role)) || [];

  const startEditMode = (task: Task) => {
    setEditForm({
      title: task.title,
      description: task.description || "",
      assignedTo: task.assignedTo.toString(),
      companyId: task.companyId?.toString() || "",
      priority: task.priority,
      deadline: task.deadline || "",
      notes: task.notes || "",
    });
    setEditMode(true);
  };

  const handleEditSubmit = () => {
    if (!selectedTask) return;
    if (!editForm.title || !editForm.assignedTo) {
      toast({ title: "Error", description: "Judul dan penerima tugas wajib diisi", variant: "destructive" });
      return;
    }
    updateMutation.mutate({
      id: selectedTask.id,
      data: {
        title: editForm.title,
        description: editForm.description || null,
        assignedTo: parseInt(editForm.assignedTo),
        companyId: editForm.companyId ? parseInt(editForm.companyId) : null,
        priority: editForm.priority,
        deadline: editForm.deadline || null,
        notes: editForm.notes || null,
      },
    });
  };

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
                <div className="space-y-1.5">
                  <Label>Ditugaskan kepada * {form.selectedAssignees.length > 0 && <span className="text-xs text-muted-foreground ml-1">({form.selectedAssignees.length} dipilih)</span>}</Label>
                  <div className="border rounded-md max-h-[180px] overflow-y-auto" data-testid="select-task-assignee">
                    <div
                      className="flex items-center gap-2 px-3 py-2 border-b cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={toggleSelectAllAssignees}
                      data-testid="checkbox-select-all-assignees"
                    >
                      <div className={`flex items-center justify-center w-4 h-4 rounded border ${assignableUsers.length > 0 && form.selectedAssignees.length === assignableUsers.length ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"}`}>
                        {assignableUsers.length > 0 && form.selectedAssignees.length === assignableUsers.length && <Check className="w-3 h-3" />}
                      </div>
                      <span className="text-sm font-medium">Pilih Semua</span>
                    </div>
                    {assignableUsers.map((u: any) => {
                      const isSelected = form.selectedAssignees.includes(u.id.toString());
                      return (
                        <div
                          key={u.id}
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => toggleAssignee(u.id.toString())}
                          data-testid={`checkbox-assignee-${u.id}`}
                        >
                          <div className={`flex items-center justify-center w-4 h-4 rounded border ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"}`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <span className="text-sm">{u.fullName} ({getRoleLabel(u.role)})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>PT Terkait</Label>
                    <Select value={form.companyId} onValueChange={v => setForm({...form, companyId: v})}>
                      <SelectTrigger><SelectValue placeholder="Pilih PT" /></SelectTrigger>
                      <SelectContent>{companiesData?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.code}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
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
                <Button data-testid="button-submit-task" onClick={handleSubmit} className="w-full" disabled={isSending}>
                  {isSending ? "Menyimpan..." : `Simpan Tugas${form.selectedAssignees.length > 1 ? ` (${form.selectedAssignees.length} orang)` : ""}`}
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
            <Input data-testid="input-search-task" placeholder="Cari tugas..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-10" />
          </div>
          <Select value={sortBy} onValueChange={v => { setSortBy(v); setCurrentPage(1); }}>
            <SelectTrigger data-testid="select-sort-task" className="w-48">
              <ArrowUpDown className="w-4 h-4 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deadline-desc">Deadline Terbaru</SelectItem>
              <SelectItem value="deadline-asc">Deadline Terlama</SelectItem>
              <SelectItem value="priority-desc">Prioritas Tertinggi</SelectItem>
              <SelectItem value="priority-asc">Prioritas Terendah</SelectItem>
              <SelectItem value="progress-desc">Progress Tertinggi</SelectItem>
              <SelectItem value="progress-asc">Progress Terendah</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger data-testid="select-filter-status-task" className="w-44">
              <Filter className="w-4 h-4 mr-1" /><SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v); setCurrentPage(1); }}>
            <SelectTrigger data-testid="select-filter-priority-task" className="w-40">
              <SelectValue placeholder="Semua Prioritas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Prioritas</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={v => { setAssigneeFilter(v); setCurrentPage(1); }}>
            <SelectTrigger data-testid="select-filter-assignee" className="w-48">
              <SelectValue placeholder="Semua Penerima" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Penerima</SelectItem>
              {assignableUsers.map((u: any) => (
                <SelectItem key={u.id} value={u.id.toString()}>{u.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isLoading && !isError && tasks && tasks.length > 0 && (() => {
        const src = filtered;
        const total = src.length;
        const byStatus: Record<string, number> = {};
        const byPriority: Record<string, number> = {};
        src.forEach(t => {
          byStatus[t.status] = (byStatus[t.status] || 0) + 1;
          byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
        });
        const avgProgress = total > 0 ? Math.round(src.reduce((s, t) => s + t.progress, 0) / total) : 0;
        const overdue = src.filter(t => t.deadline && t.status !== "Selesai" && new Date(t.deadline) < new Date()).length;
        return (
          <Card data-testid="card-task-summary">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold flex-wrap">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span>Ringkasan</span>
                <Badge variant="secondary" className="ml-1" data-testid="text-total-tasks">{total} tugas</Badge>
                <Badge variant="outline" className="ml-1">Rata-rata progress: {avgProgress}%</Badge>
                {overdue > 0 && <Badge variant="destructive" className="ml-1">{overdue} melewati deadline</Badge>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-medium text-muted-foreground mb-1.5">Status</p>
                  <div className="space-y-1">
                    {STATUSES.filter(s => byStatus[s]).map(s => (
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
        <QueryError message="Gagal memuat data tugas. Silakan coba lagi." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Belum ada tugas</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {pagedItems.map(t => (
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
          <DataPagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={setCurrentPage} />
        </div>
      )}

      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => { setSelectedTask(null); setEditMode(false); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <DialogTitle>{editMode ? "Edit Tugas" : selectedTask.title}</DialogTitle>
                {canEditTask && !editMode && (
                  <Button variant="ghost" size="icon" onClick={() => startEditMode(selectedTask)} data-testid={`button-edit-task-${selectedTask.id}`}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
                {editMode && (
                  <Button variant="ghost" size="icon" onClick={() => setEditMode(false)} data-testid="button-cancel-edit-task">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </DialogHeader>
            {editMode ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Judul Tugas *</Label>
                  <Input data-testid="input-edit-task-title" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Deskripsi</Label>
                  <Textarea data-testid="input-edit-task-description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Ditugaskan kepada *</Label>
                    <Select value={editForm.assignedTo} onValueChange={v => setEditForm({ ...editForm, assignedTo: v })}>
                      <SelectTrigger data-testid="select-edit-task-assignee"><SelectValue placeholder="Pilih penerima" /></SelectTrigger>
                      <SelectContent>
                        {assignableUsers.map((u: any) => (
                          <SelectItem key={u.id} value={u.id.toString()}>{u.fullName} ({getRoleLabel(u.role)})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>PT Terkait</Label>
                    <Select value={editForm.companyId} onValueChange={v => setEditForm({ ...editForm, companyId: v })}>
                      <SelectTrigger data-testid="select-edit-task-company"><SelectValue placeholder="Pilih PT" /></SelectTrigger>
                      <SelectContent>{companiesData?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.code}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Prioritas</Label>
                    <Select value={editForm.priority} onValueChange={v => setEditForm({ ...editForm, priority: v })}>
                      <SelectTrigger data-testid="select-edit-task-priority"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Deadline</Label>
                    <Input data-testid="input-edit-task-deadline" type="date" value={editForm.deadline} onChange={e => setEditForm({ ...editForm, deadline: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Catatan</Label>
                  <Textarea data-testid="input-edit-task-notes" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
                </div>
                <Button data-testid="button-submit-edit-task" onClick={handleEditSubmit} className="w-full" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={selectedTask.status} /></div>
                  <div><p className="text-xs text-muted-foreground">Prioritas</p><p className="text-sm">{selectedTask.priority}</p></div>
                  <div><p className="text-xs text-muted-foreground">Diberikan kepada</p><p className="text-sm">{getUserName(selectedTask.assignedTo)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Dibuat oleh</p><p className="text-sm">{getUserName(selectedTask.createdBy)}</p></div>
                  {selectedTask.deadline && <div><p className="text-xs text-muted-foreground">Deadline</p><p className="text-sm">{selectedTask.deadline}</p></div>}
                  {selectedTask.companyId && <div><p className="text-xs text-muted-foreground">PT Terkait</p><p className="text-sm">{getCompanyName(selectedTask.companyId)}</p></div>}
                </div>
                {selectedTask.description && <div><p className="text-xs text-muted-foreground mb-1">Deskripsi</p><p className="text-sm">{selectedTask.description}</p></div>}
                {selectedTask.notes && <div><p className="text-xs text-muted-foreground mb-1">Catatan</p><p className="text-sm">{selectedTask.notes}</p></div>}
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
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
