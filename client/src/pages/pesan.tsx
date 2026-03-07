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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Mail, MailOpen, Send, User, Clock } from "lucide-react";
import { DataPagination, usePagination } from "@/components/data-pagination";
import type { Message } from "@shared/schema";

export default function PesanPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: messages, isLoading } = useQuery<Message[]>({ queryKey: ["/api/messages"] });
  const { data: usersData } = useQuery<any[]>({ queryKey: ["/api/users"] });

  const [form, setForm] = useState({ receiverId: "", subject: "", content: "" });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/messages", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: "Berhasil", description: "Pesan terkirim" });
      setDialogOpen(false);
      setForm({ receiverId: "", subject: "", content: "" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal mengirim pesan", variant: "destructive" });
    },
  });

  const readMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/messages/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  const handleSubmit = () => {
    if (!form.receiverId || !form.content) {
      toast({ title: "Error", description: "Penerima dan isi pesan wajib diisi", variant: "destructive" });
      return;
    }
    createMutation.mutate({ ...form, receiverId: parseInt(form.receiverId) });
  };

  const getUserName = (id: number) => usersData?.find((u: any) => u.id === id)?.fullName || "Unknown";
  const otherUsers = usersData?.filter((u: any) => u.id !== user?.id) || [];

  const allMessages = messages || [];
  const { totalPages, totalItems, getPageItems } = usePagination(allMessages, 20);
  const pagedItems = getPageItems(currentPage);
  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Pesan</h1>
          <p className="text-sm text-muted-foreground">Komunikasi privat antar user</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-message"><Plus className="w-4 h-4 mr-1" /> Pesan Baru</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Kirim Pesan Baru</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Kepada *</Label>
                <Select value={form.receiverId} onValueChange={v => setForm({...form, receiverId: v})}>
                  <SelectTrigger data-testid="select-message-receiver"><SelectValue placeholder="Pilih penerima" /></SelectTrigger>
                  <SelectContent>
                    {otherUsers.map((u: any) => (
                      <SelectItem key={u.id} value={u.id.toString()}>{u.fullName} ({getRoleLabel(u.role)})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Subjek</Label>
                <Input data-testid="input-message-subject" placeholder="Subjek pesan" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Isi Pesan *</Label>
                <Textarea data-testid="input-message-content" placeholder="Tulis pesan..." value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="min-h-[100px]" />
              </div>
              <Button data-testid="button-submit-message" onClick={handleSubmit} className="w-full" disabled={createMutation.isPending}>
                <Send className="w-4 h-4 mr-1" /> {createMutation.isPending ? "Mengirim..." : "Kirim Pesan"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : messages?.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Belum ada pesan</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {pagedItems.map(msg => {
            const isSender = msg.senderId === user?.id;
            const isUnread = !msg.isRead && !isSender;
            return (
              <Card
                key={msg.id}
                className={`hover-elevate cursor-pointer ${isUnread ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
                data-testid={`card-message-${msg.id}`}
                onClick={() => { if (isUnread) readMutation.mutate(msg.id); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isUnread ? <Mail className="w-4 h-4 text-blue-500" /> : <MailOpen className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {isSender ? `Kepada: ${getUserName(msg.receiverId)}` : `Dari: ${getUserName(msg.senderId)}`}
                        </span>
                        {msg.subject && <span className="text-sm font-medium">{msg.subject}</span>}
                      </div>
                      <p className="text-sm line-clamp-2">{msg.content}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(msg.createdAt).toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <DataPagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={setCurrentPage} />
        </div>
      )}
    </div>
  );
}
