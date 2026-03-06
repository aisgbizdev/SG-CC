import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRoute, Link } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "./dashboard";
import { ArrowLeft, MessageSquare, Send, Calendar, User } from "lucide-react";
import type { Activity, Comment, User as UserType } from "@shared/schema";

export default function AktivitasDetailPage() {
  const [, params] = useRoute("/aktivitas/:id");
  const id = parseInt(params?.id || "0");
  const { user } = useAuth();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [editing, setEditing] = useState(false);

  const { data: activity, isLoading } = useQuery<Activity>({ queryKey: ["/api/activities", id] });
  const { data: commentsData } = useQuery<Comment[]>({ queryKey: ["/api/comments", "activity", id] });
  const { data: usersData } = useQuery<any[]>({ queryKey: ["/api/users"] });
  const { data: companiesData } = useQuery<any[]>({ queryKey: ["/api/companies"] });

  const [editForm, setEditForm] = useState<Partial<Activity>>({});

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/activities/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Berhasil", description: "Aktivitas diperbarui" });
      setEditing(false);
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/comments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments", "activity", id] });
      setCommentText("");
    },
  });

  const getUserName = (userId: number) => usersData?.find((u: any) => u.id === userId)?.fullName || "Unknown";
  const getCompanyName = (companyId: number) => companiesData?.find((c: any) => c.id === companyId)?.name || "-";

  const canEdit = user?.role === "superadmin" ||
    (["du", "dk"].includes(user?.role || "") && activity?.createdBy === user?.id);

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;
  if (!activity) return <div className="p-6"><p className="text-muted-foreground">Aktivitas tidak ditemukan</p></div>;

  const startEdit = () => {
    setEditForm({
      status: activity.status,
      progress: activity.progress,
      result: activity.result,
      nextAction: activity.nextAction,
    });
    setEditing(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/aktivitas"><Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold" data-testid="text-activity-title">{activity.title}</h1>
          <p className="text-sm text-muted-foreground">{getCompanyName(activity.companyId)}</p>
        </div>
        {canEdit && !editing && <Button size="sm" onClick={startEdit} data-testid="button-edit-activity">Edit</Button>}
      </div>

      {editing ? (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editForm.status || ""} onValueChange={v => setEditForm({...editForm, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Direncanakan","Sedang Dikerjakan","Menunggu Review","Selesai","Tertunda","Overdue"].map(s =>
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Progress (%)</Label>
                <Input type="number" min={0} max={100} value={editForm.progress || 0} onChange={e => setEditForm({...editForm, progress: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Hasil / Perkembangan</Label>
              <Textarea value={editForm.result || ""} onChange={e => setEditForm({...editForm, result: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label>Tindak Lanjut</Label>
              <Textarea value={editForm.nextAction || ""} onChange={e => setEditForm({...editForm, nextAction: e.target.value})} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => updateMutation.mutate(editForm)} disabled={updateMutation.isPending} data-testid="button-save-activity">Simpan</Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="md:col-span-2">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <StatusBadge status={activity.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prioritas</p>
                  <p className="text-sm font-medium">{activity.priority}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal</p>
                  <p className="text-sm">{activity.date}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Target Selesai</p>
                  <p className="text-sm">{activity.targetDate || "-"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Progress</p>
                <div className="flex items-center gap-3">
                  <Progress value={activity.progress} className="h-2 flex-1" />
                  <span className="text-sm font-medium">{activity.progress}%</span>
                </div>
              </div>
              {activity.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Deskripsi</p>
                  <p className="text-sm">{activity.description}</p>
                </div>
              )}
              {activity.result && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Hasil / Perkembangan</p>
                  <p className="text-sm">{activity.result}</p>
                </div>
              )}
              {activity.nextAction && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tindak Lanjut</p>
                  <p className="text-sm">{activity.nextAction}</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Dibuat oleh</p>
                <p className="text-sm font-medium">{getUserName(activity.createdBy)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">PT</p>
                <p className="text-sm">{getCompanyName(activity.companyId)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dibuat pada</p>
                <p className="text-sm">{new Date(activity.createdAt).toLocaleDateString("id-ID")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Terakhir diupdate</p>
                <p className="text-sm">{new Date(activity.updatedAt).toLocaleDateString("id-ID")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Komentar ({commentsData?.length || 0})</h3>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {commentsData?.map(c => (
            <div key={c.id} className="p-3 bg-muted/50 rounded-md space-y-1" data-testid={`comment-${c.id}`}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="w-3 h-3" />
                <span className="font-medium">{getUserName(c.createdBy)}</span>
                <span>{new Date(c.createdAt).toLocaleString("id-ID")}</span>
              </div>
              <p className="text-sm">{c.content}</p>
            </div>
          ))}
          <div className="flex gap-2">
            <Textarea
              data-testid="input-comment"
              placeholder="Tulis komentar..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              className="flex-1 min-h-[60px]"
            />
            <Button
              data-testid="button-send-comment"
              size="icon"
              onClick={() => {
                if (!commentText.trim()) return;
                commentMutation.mutate({ entityType: "activity", entityId: id, content: commentText });
              }}
              disabled={commentMutation.isPending || !commentText.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
