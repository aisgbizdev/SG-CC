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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, MailOpen, Send, Clock, Check, AlertTriangle, Reply, Filter } from "lucide-react";
import { DataPagination, usePagination } from "@/components/data-pagination";
import { usePageTitle } from "@/hooks/use-page-title";
import { QueryError } from "@/components/query-error";
import type { Message } from "@shared/schema";

type TagFilter = "semua" | "perlu_arahan" | "umum";

export default function PesanPage() {
  usePageTitle("Pesan");
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [tagFilter, setTagFilter] = useState<TagFilter>("semua");

  const { data: messages, isLoading, isError, refetch } = useQuery<Message[]>({ queryKey: ["/api/messages"] });
  const { data: usersData } = useQuery<any[]>({ queryKey: ["/api/users"] });

  const [form, setForm] = useState({ receiverIds: [] as string[], subject: "", content: "", tag: "" });
  const [replyContent, setReplyContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  const getUserName = (id: number) => usersData?.find((u: any) => u.id === id)?.fullName || "Unknown";
  const otherUsers = usersData?.filter((u: any) => u.id !== user?.id) || [];

  const readMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/messages/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  const handleSubmit = async () => {
    if (form.receiverIds.length === 0 || !form.content) {
      toast({ title: "Error", description: "Penerima dan isi pesan wajib diisi", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      const results = await Promise.allSettled(
        form.receiverIds.map((rid) =>
          apiRequest("POST", "/api/messages", {
            receiverId: parseInt(rid),
            subject: form.subject || null,
            content: form.content,
            tag: form.tag || null,
          }).then((res) => res.json())
        )
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      if (failed === 0) {
        toast({ title: "Berhasil", description: `Pesan terkirim ke ${succeeded} penerima` });
        setDialogOpen(false);
        setForm({ receiverIds: [], subject: "", content: "", tag: "" });
      } else if (succeeded > 0) {
        toast({ title: "Sebagian Berhasil", description: `${succeeded} terkirim, ${failed} gagal`, variant: "destructive" });
        setDialogOpen(false);
        setForm({ receiverIds: [], subject: "", content: "", tag: "" });
      } else {
        toast({ title: "Gagal", description: "Gagal mengirim semua pesan", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message || "Gagal mengirim pesan", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleReply = async () => {
    if (!replyTo || !replyContent) return;
    setIsSending(true);
    try {
      await apiRequest("POST", "/api/messages", {
        receiverId: replyTo.senderId,
        subject: replyTo.subject ? `Re: ${replyTo.subject}` : null,
        content: replyContent,
      }).then((res) => res.json());
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: "Berhasil", description: "Balasan terkirim" });
      setReplyDialogOpen(false);
      setReplyTo(null);
      setReplyContent("");
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message || "Gagal mengirim balasan", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const openReply = (msg: Message, e: React.MouseEvent) => {
    e.stopPropagation();
    setReplyTo(msg);
    setReplyContent("");
    setReplyDialogOpen(true);
  };

  const toggleReceiver = (id: string) => {
    setForm((prev) => ({
      ...prev,
      receiverIds: prev.receiverIds.includes(id)
        ? prev.receiverIds.filter((r) => r !== id)
        : [...prev.receiverIds, id],
    }));
  };

  const toggleSelectAll = () => {
    const allIds = otherUsers.map((u: any) => u.id.toString());
    const allSelected = allIds.length > 0 && allIds.every((id: string) => form.receiverIds.includes(id));
    setForm((prev) => ({
      ...prev,
      receiverIds: allSelected ? [] : allIds,
    }));
  };

  const allMessages = messages || [];
  const filteredMessages = allMessages.filter((msg) => {
    if (tagFilter === "perlu_arahan") return (msg as any).tag === "perlu_arahan";
    if (tagFilter === "umum") return !(msg as any).tag || (msg as any).tag !== "perlu_arahan";
    return true;
  });

  const perluArahanCount = allMessages.filter((msg) => (msg as any).tag === "perlu_arahan").length;

  const { totalPages, totalItems, getPageItems } = usePagination(filteredMessages, 20);
  const pagedItems = getPageItems(currentPage);

  const isDuDk = user?.role === "du" || user?.role === "dk";

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
                <Label>Kepada * {form.receiverIds.length > 0 && <span className="text-xs text-muted-foreground ml-1">({form.receiverIds.length} dipilih)</span>}</Label>
                <div className="border rounded-md max-h-[180px] overflow-y-auto" data-testid="select-message-receiver">
                  <div
                    className="flex items-center gap-2 px-3 py-2 border-b cursor-pointer hover-elevate"
                    onClick={toggleSelectAll}
                    data-testid="checkbox-select-all-receivers"
                  >
                    <div className={`flex items-center justify-center w-4 h-4 rounded border ${otherUsers.length > 0 && otherUsers.every((u: any) => form.receiverIds.includes(u.id.toString())) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"}`}>
                      {otherUsers.length > 0 && otherUsers.every((u: any) => form.receiverIds.includes(u.id.toString())) && <Check className="w-3 h-3" />}
                    </div>
                    <span className="text-sm font-medium">Pilih Semua</span>
                  </div>
                  {otherUsers.map((u: any) => {
                    const isSelected = form.receiverIds.includes(u.id.toString());
                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover-elevate"
                        onClick={() => toggleReceiver(u.id.toString())}
                        data-testid={`checkbox-receiver-${u.id}`}
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
              <div className="space-y-1.5">
                <Label>Subjek</Label>
                <Input data-testid="input-message-subject" placeholder="Subjek pesan" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Isi Pesan *</Label>
                <Textarea data-testid="input-message-content" placeholder="Tulis pesan..." value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="min-h-[100px]" />
              </div>
              {isDuDk && (
                <div
                  className="flex items-center gap-2 cursor-pointer p-2 rounded-md border hover-elevate"
                  onClick={() => setForm(prev => ({ ...prev, tag: prev.tag === "perlu_arahan" ? "" : "perlu_arahan" }))}
                  data-testid="checkbox-perlu-arahan"
                >
                  <div className={`flex items-center justify-center w-4 h-4 rounded border ${form.tag === "perlu_arahan" ? "bg-red-500 border-red-500 text-white" : "border-muted-foreground"}`}>
                    {form.tag === "perlu_arahan" && <Check className="w-3 h-3" />}
                  </div>
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium">Tandai sebagai Perlu Arahan</span>
                </div>
              )}
              <Button data-testid="button-submit-message" onClick={handleSubmit} className="w-full" disabled={isSending}>
                <Send className="w-4 h-4 mr-1" /> {isSending ? "Mengirim..." : `Kirim Pesan${form.receiverIds.length > 1 ? ` (${form.receiverIds.length})` : ""}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 flex-wrap" data-testid="filter-tag-messages">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Button
          variant={tagFilter === "semua" ? "default" : "outline"}
          size="sm"
          onClick={() => { setTagFilter("semua"); setCurrentPage(1); }}
          data-testid="filter-semua"
        >
          Semua ({allMessages.length})
        </Button>
        <Button
          variant={tagFilter === "perlu_arahan" ? "default" : "outline"}
          size="sm"
          onClick={() => { setTagFilter("perlu_arahan"); setCurrentPage(1); }}
          data-testid="filter-perlu-arahan"
          className={tagFilter !== "perlu_arahan" && perluArahanCount > 0 ? "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20" : ""}
        >
          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
          Perlu Arahan ({perluArahanCount})
        </Button>
        <Button
          variant={tagFilter === "umum" ? "default" : "outline"}
          size="sm"
          onClick={() => { setTagFilter("umum"); setCurrentPage(1); }}
          data-testid="filter-umum"
        >
          Umum ({allMessages.length - perluArahanCount})
        </Button>
      </div>

      {isError ? (
        <QueryError message="Gagal memuat data pesan. Silakan coba lagi." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : filteredMessages.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">{tagFilter === "semua" ? "Belum ada pesan" : tagFilter === "perlu_arahan" ? "Tidak ada pesan Perlu Arahan" : "Tidak ada pesan umum"}</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {pagedItems.map(msg => {
            const isSender = msg.senderId === user?.id;
            const isUnread = !msg.isRead && !isSender;
            const isPerluArahan = (msg as any).tag === "perlu_arahan";
            return (
              <Card
                key={msg.id}
                className={`hover-elevate cursor-pointer ${isUnread ? "bg-blue-50/50 dark:bg-blue-900/10" : ""} ${isPerluArahan ? "border-red-300 dark:border-red-700" : ""}`}
                data-testid={`card-message-${msg.id}`}
                onClick={() => { if (isUnread) readMutation.mutate(msg.id); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isPerluArahan ? (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      ) : isUnread ? (
                        <Mail className="w-4 h-4 text-blue-500" />
                      ) : (
                        <MailOpen className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {isSender ? `Kepada: ${getUserName(msg.receiverId)}` : `Dari: ${getUserName(msg.senderId)}`}
                        </span>
                        {isPerluArahan && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0" data-testid={`badge-perlu-arahan-${msg.id}`}>
                            Perlu Arahan
                          </Badge>
                        )}
                        {msg.subject && <span className="text-sm font-medium">{msg.subject}</span>}
                      </div>
                      <p className="text-sm line-clamp-2">{msg.content}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(msg.createdAt).toLocaleString("id-ID")}
                        </p>
                        {!isSender && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => openReply(msg, e)}
                            data-testid={`button-reply-${msg.id}`}
                          >
                            <Reply className="w-3.5 h-3.5 mr-1" /> Balas
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <DataPagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={setCurrentPage} />
        </div>
      )}

      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Balas Pesan</DialogTitle></DialogHeader>
          {replyTo && (
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-muted/50 space-y-1">
                <p className="text-xs text-muted-foreground">Dari: {getUserName(replyTo.senderId)}</p>
                {replyTo.subject && <p className="text-sm font-medium">{replyTo.subject}</p>}
                <p className="text-sm line-clamp-3">{replyTo.content}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Balasan *</Label>
                <Textarea
                  data-testid="input-reply-content"
                  placeholder="Tulis balasan..."
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <Button data-testid="button-submit-reply" onClick={handleReply} className="w-full" disabled={isSending || !replyContent}>
                <Send className="w-4 h-4 mr-1" /> {isSending ? "Mengirim..." : "Kirim Balasan"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
