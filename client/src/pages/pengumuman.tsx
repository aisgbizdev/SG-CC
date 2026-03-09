import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Megaphone, Pin, Eye, Calendar, User, Pencil, Trash2, Check } from "lucide-react";
import { getRoleLabel } from "@/lib/auth";
import { DataPagination, usePagination } from "@/components/data-pagination";
import { usePageTitle } from "@/hooks/use-page-title";
import { QueryError } from "@/components/query-error";
import type { Announcement } from "@shared/schema";

export default function PengumumanPage() {
  usePageTitle("Pengumuman");
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: announcements, isLoading, isError, refetch } = useQuery<Announcement[]>({ queryKey: ["/api/announcements"] });
  const { data: usersData } = useQuery<any[]>({ queryKey: ["/api/users"] });

  const emptyForm = {
    title: "", content: "", priority: "Normal",
    targetType: "all", targetValue: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "", isPinned: false,
    selectedRecipients: [] as string[],
  };

  const [form, setForm] = useState(emptyForm);

  const [editForm, setEditForm] = useState(emptyForm);

  const otherUsers = usersData?.filter((u: any) => u.id !== user?.id && u.isActive !== false) || [];

  const toggleRecipient = (uid: string, isEdit = false) => {
    if (isEdit) {
      setEditForm(prev => ({
        ...prev,
        selectedRecipients: prev.selectedRecipients.includes(uid)
          ? prev.selectedRecipients.filter(id => id !== uid)
          : [...prev.selectedRecipients, uid],
      }));
    } else {
      setForm(prev => ({
        ...prev,
        selectedRecipients: prev.selectedRecipients.includes(uid)
          ? prev.selectedRecipients.filter(id => id !== uid)
          : [...prev.selectedRecipients, uid],
      }));
    }
  };

  const toggleSelectAllRecipients = (isEdit = false) => {
    const allIds = otherUsers.map((u: any) => u.id.toString());
    if (isEdit) {
      setEditForm(prev => ({
        ...prev,
        selectedRecipients: prev.selectedRecipients.length === allIds.length ? [] : allIds,
      }));
    } else {
      setForm(prev => ({
        ...prev,
        selectedRecipients: prev.selectedRecipients.length === allIds.length ? [] : allIds,
      }));
    }
  };

  const buildTarget = (recipients: string[]) => {
    if (recipients.length === 0 || recipients.length === otherUsers.length) {
      return { targetType: "all", targetValue: null };
    }
    return { targetType: "users", targetValue: recipients.join(",") };
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/announcements", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Berhasil", description: "Pengumuman berhasil dibuat" });
      setDialogOpen(false);
      setForm(emptyForm);
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/announcements/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Berhasil", description: "Pengumuman berhasil diperbarui" });
      setEditDialogOpen(false);
      setSelectedAnnouncement(null);
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal memperbarui", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/announcements/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Berhasil", description: "Pengumuman berhasil dihapus" });
      setDeleteDialogOpen(false);
      setSelectedAnnouncement(null);
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal menghapus", variant: "destructive" });
    },
  });

  const readMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/announcements/${id}/read`);
      return res.json();
    },
  });

  const handleSubmit = () => {
    if (!form.title || !form.content) {
      toast({ title: "Error", description: "Judul dan isi wajib diisi", variant: "destructive" });
      return;
    }
    const target = buildTarget(form.selectedRecipients);
    createMutation.mutate({
      title: form.title,
      content: form.content,
      priority: form.priority,
      startDate: form.startDate,
      endDate: form.endDate || null,
      isPinned: form.isPinned,
      ...target,
    });
  };

  const handleEditSubmit = () => {
    if (!editForm.title || !editForm.content) {
      toast({ title: "Error", description: "Judul dan isi wajib diisi", variant: "destructive" });
      return;
    }
    if (!selectedAnnouncement) return;
    const target = buildTarget(editForm.selectedRecipients);
    updateMutation.mutate({
      id: selectedAnnouncement.id,
      data: {
        title: editForm.title,
        content: editForm.content,
        priority: editForm.priority,
        startDate: editForm.startDate,
        endDate: editForm.endDate || null,
        isPinned: editForm.isPinned,
        ...target,
      },
    });
  };

  const openEditDialog = (ann: Announcement) => {
    setSelectedAnnouncement(ann);
    const allIds = otherUsers.map((u: any) => u.id.toString());
    setEditForm({
      title: ann.title,
      content: ann.content,
      priority: ann.priority || "Normal",
      targetType: ann.targetType || "all",
      targetValue: ann.targetValue || "",
      startDate: ann.startDate || new Date().toISOString().split("T")[0],
      endDate: ann.endDate || "",
      isPinned: ann.isPinned || false,
      selectedRecipients: ann.targetType === "users" && ann.targetValue ? ann.targetValue.split(",") : allIds,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (ann: Announcement) => {
    setSelectedAnnouncement(ann);
    setDeleteDialogOpen(true);
  };

  const canModify = (ann: Announcement) => {
    if (!user) return false;
    return user.role === "superadmin" || ann.createdBy === user.id;
  };

  const getUserName = (id: number) => usersData?.find((u: any) => u.id === id)?.fullName || "Unknown";
  const canCreate = ["superadmin", "owner"].includes(user?.role || "");

  const allAnnouncements = announcements || [];
  const { totalPages, totalItems, getPageItems } = usePagination(allAnnouncements, 20);
  const pagedItems = getPageItems(currentPage);
  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Pengumuman</h1>
          <p className="text-sm text-muted-foreground">Pengumuman resmi dari manajemen</p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-announcement"><Plus className="w-4 h-4 mr-1" /> Buat Pengumuman</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Buat Pengumuman Baru</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Judul *</Label>
                  <Input data-testid="input-announcement-title" placeholder="Judul pengumuman" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>Isi Pengumuman *</Label>
                  <Textarea data-testid="input-announcement-content" placeholder="Isi pengumuman" value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="min-h-[120px]" />
                </div>
                <div className="space-y-1.5">
                  <Label>Target Penerima {form.selectedRecipients.length > 0 && form.selectedRecipients.length < otherUsers.length && <span className="text-xs text-muted-foreground ml-1">({form.selectedRecipients.length} dipilih)</span>}</Label>
                  <div className="border rounded-md max-h-[180px] overflow-y-auto" data-testid="select-announcement-recipients">
                    <div
                      className="flex items-center gap-2 px-3 py-2 border-b cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => toggleSelectAllRecipients(false)}
                      data-testid="checkbox-select-all-recipients"
                    >
                      <div className={`flex items-center justify-center w-4 h-4 rounded border ${otherUsers.length > 0 && (form.selectedRecipients.length === 0 || form.selectedRecipients.length === otherUsers.length) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"}`}>
                        {(form.selectedRecipients.length === 0 || form.selectedRecipients.length === otherUsers.length) && <Check className="w-3 h-3" />}
                      </div>
                      <span className="text-sm font-medium">Semua User</span>
                    </div>
                    {otherUsers.map((u: any) => {
                      const isSelected = form.selectedRecipients.includes(u.id.toString()) || form.selectedRecipients.length === 0;
                      return (
                        <div
                          key={u.id}
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => {
                            if (form.selectedRecipients.length === 0) {
                              const allIds = otherUsers.map((x: any) => x.id.toString());
                              setForm(prev => ({ ...prev, selectedRecipients: allIds.filter(id => id !== u.id.toString()) }));
                            } else {
                              toggleRecipient(u.id.toString(), false);
                            }
                          }}
                          data-testid={`checkbox-recipient-${u.id}`}
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
                    <Label>Prioritas</Label>
                    <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Tinggi">Tinggi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tanggal Mulai</Label>
                    <Input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tanggal Berakhir</Label>
                    <Input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
                  </div>
                </div>
                <Button data-testid="button-submit-announcement" onClick={handleSubmit} className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Menyimpan..." : "Kirim Pengumuman"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isError ? (
        <QueryError message="Gagal memuat data pengumuman. Silakan coba lagi." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : announcements?.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Belum ada pengumuman</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {pagedItems.map(ann => (
            <Card key={ann.id} data-testid={`card-announcement-${ann.id}`} onClick={() => readMutation.mutate(ann.id)}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {ann.isPinned && <Pin className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                    <h3 className="font-semibold">{ann.title}</h3>
                    {ann.priority === "Tinggi" && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Penting</span>
                    )}
                  </div>
                  {canModify(ann) && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`button-edit-announcement-${ann.id}`}
                        onClick={(e) => { e.stopPropagation(); openEditDialog(ann); }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`button-delete-announcement-${ann.id}`}
                        onClick={(e) => { e.stopPropagation(); openDeleteDialog(ann); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-sm leading-relaxed">{ann.content}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{getUserName(ann.createdBy)}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{ann.startDate}</span>
                  <span className="flex items-center gap-1">
                    <Megaphone className="w-3 h-3" />
                    {ann.targetType === "all" ? "Semua User" : ann.targetType === "users" ? `${(ann.targetValue || "").split(",").length} penerima` : ann.targetType === "role" ? `Role: ${ann.targetValue}` : `PT: ${ann.targetValue}`}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
          <DataPagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={setCurrentPage} />
        </div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Pengumuman</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Judul *</Label>
              <Input data-testid="input-edit-announcement-title" placeholder="Judul pengumuman" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label>Isi Pengumuman *</Label>
              <Textarea data-testid="input-edit-announcement-content" placeholder="Isi pengumuman" value={editForm.content} onChange={e => setEditForm({...editForm, content: e.target.value})} className="min-h-[120px]" />
            </div>
            <div className="space-y-1.5">
              <Label>Target Penerima {editForm.selectedRecipients.length > 0 && editForm.selectedRecipients.length < otherUsers.length && <span className="text-xs text-muted-foreground ml-1">({editForm.selectedRecipients.length} dipilih)</span>}</Label>
              <div className="border rounded-md max-h-[180px] overflow-y-auto" data-testid="select-edit-announcement-recipients">
                <div
                  className="flex items-center gap-2 px-3 py-2 border-b cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => toggleSelectAllRecipients(true)}
                  data-testid="checkbox-edit-select-all-recipients"
                >
                  <div className={`flex items-center justify-center w-4 h-4 rounded border ${otherUsers.length > 0 && (editForm.selectedRecipients.length === 0 || editForm.selectedRecipients.length === otherUsers.length) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"}`}>
                    {(editForm.selectedRecipients.length === 0 || editForm.selectedRecipients.length === otherUsers.length) && <Check className="w-3 h-3" />}
                  </div>
                  <span className="text-sm font-medium">Semua User</span>
                </div>
                {otherUsers.map((u: any) => {
                  const isSelected = editForm.selectedRecipients.includes(u.id.toString()) || editForm.selectedRecipients.length === 0;
                  return (
                    <div
                      key={u.id}
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => {
                        if (editForm.selectedRecipients.length === 0) {
                          const allIds = otherUsers.map((x: any) => x.id.toString());
                          setEditForm(prev => ({ ...prev, selectedRecipients: allIds.filter(id => id !== u.id.toString()) }));
                        } else {
                          toggleRecipient(u.id.toString(), true);
                        }
                      }}
                      data-testid={`checkbox-edit-recipient-${u.id}`}
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
                <Label>Prioritas</Label>
                <Select value={editForm.priority} onValueChange={v => setEditForm({...editForm, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Tinggi">Tinggi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Mulai</Label>
                <Input type="date" value={editForm.startDate} onChange={e => setEditForm({...editForm, startDate: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Berakhir</Label>
                <Input type="date" value={editForm.endDate} onChange={e => setEditForm({...editForm, endDate: e.target.value})} />
              </div>
            </div>
            <Button data-testid="button-submit-edit-announcement" onClick={handleEditSubmit} className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengumuman</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pengumuman "{selectedAnnouncement?.title}"? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-announcement">Batal</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete-announcement"
              onClick={() => selectedAnnouncement && deleteMutation.mutate(selectedAnnouncement.id)}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
