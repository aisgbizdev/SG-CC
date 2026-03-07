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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Megaphone, Pin, Eye, Calendar, User } from "lucide-react";
import { DataPagination, usePagination } from "@/components/data-pagination";
import type { Announcement } from "@shared/schema";

export default function PengumumanPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: announcements, isLoading } = useQuery<Announcement[]>({ queryKey: ["/api/announcements"] });
  const { data: usersData } = useQuery<any[]>({ queryKey: ["/api/users"] });

  const [form, setForm] = useState({
    title: "", content: "", priority: "Normal",
    targetType: "all", targetValue: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "", isPinned: false,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/announcements", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Berhasil", description: "Pengumuman berhasil dibuat" });
      setDialogOpen(false);
      setForm({ title: "", content: "", priority: "Normal", targetType: "all", targetValue: "", startDate: new Date().toISOString().split("T")[0], endDate: "", isPinned: false });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal", variant: "destructive" });
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
    createMutation.mutate({
      ...form,
      endDate: form.endDate || null,
      targetValue: form.targetValue || null,
    });
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
                <div className="grid grid-cols-2 gap-3">
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
                    <Label>Target Penerima</Label>
                    <Select value={form.targetType} onValueChange={v => setForm({...form, targetType: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua User</SelectItem>
                        <SelectItem value="role">Per Role</SelectItem>
                        <SelectItem value="company">Per PT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
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

      {isLoading ? (
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
                </div>
                <p className="text-sm leading-relaxed">{ann.content}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{getUserName(ann.createdBy)}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{ann.startDate}</span>
                  <span className="flex items-center gap-1">
                    <Megaphone className="w-3 h-3" />
                    {ann.targetType === "all" ? "Semua User" : ann.targetType === "role" ? `Role: ${ann.targetValue}` : `PT: ${ann.targetValue}`}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
          <DataPagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={setCurrentPage} />
        </div>
      )}
    </div>
  );
}
