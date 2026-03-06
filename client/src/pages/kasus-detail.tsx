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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge, RiskBadge } from "./dashboard";
import { ArrowLeft, MessageSquare, Send, User, Clock, FileText } from "lucide-react";
import type { Case, CaseUpdate, Comment } from "@shared/schema";

const WORKFLOW_STAGES = ["Open", "Pemeriksaan Internal", "Review", "Negosiasi", "Proses Regulator", "Settlement / Deadlock", "Closed"];

export default function KasusDetailPage() {
  const [, params] = useRoute("/kasus/:id");
  const id = parseInt(params?.id || "0");
  const { user } = useAuth();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [updateContent, setUpdateContent] = useState("");
  const [newStage, setNewStage] = useState("");
  const [newProgress, setNewProgress] = useState<number | undefined>(undefined);
  const [editing, setEditing] = useState(false);

  const { data: caseData, isLoading } = useQuery<Case>({ queryKey: ["/api/cases", id] });
  const { data: caseUpdates } = useQuery<CaseUpdate[]>({ queryKey: ["/api/cases", id, "updates"] });
  const { data: commentsData } = useQuery<Comment[]>({ queryKey: ["/api/comments", "case", id] });
  const { data: usersData } = useQuery<any[]>({ queryKey: ["/api/users"] });
  const { data: companiesData } = useQuery<any[]>({ queryKey: ["/api/companies"] });

  const [editForm, setEditForm] = useState<Partial<Case>>({});

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/cases/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Berhasil", description: "Kasus diperbarui" });
      setEditing(false);
    },
  });

  const caseUpdateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/cases/${id}/updates`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id, "updates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setUpdateContent("");
      setNewStage("");
      setNewProgress(undefined);
      toast({ title: "Berhasil", description: "Update ditambahkan" });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/comments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments", "case", id] });
      setCommentText("");
    },
  });

  const getUserName = (userId: number) => usersData?.find((u: any) => u.id === userId)?.fullName || "Unknown";
  const getCompanyName = (companyId: number) => companiesData?.find((c: any) => c.id === companyId)?.name || "-";

  const canEdit = user?.role === "superadmin" || (["du", "dk"].includes(user?.role || "") && caseData?.createdBy === user?.id);
  const canUpdate = ["superadmin", "du", "dk"].includes(user?.role || "");

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;
  if (!caseData) return <div className="p-6"><p className="text-muted-foreground">Kasus tidak ditemukan</p></div>;

  const startEdit = () => {
    setEditForm({
      status: caseData.status,
      riskLevel: caseData.riskLevel,
      bucket: caseData.bucket,
      findings: caseData.findings,
      rootCause: caseData.rootCause,
      latestAction: caseData.latestAction,
      nextAction: caseData.nextAction,
    });
    setEditing(true);
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/kasus"><Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold" data-testid="text-case-code">{caseData.caseCode}</h1>
            <RiskBadge level={caseData.riskLevel} />
            <StatusBadge status={caseData.status} />
          </div>
          <p className="text-sm text-muted-foreground">{caseData.customerName} - {getCompanyName(caseData.companyId)}</p>
        </div>
        {canEdit && !editing && <Button size="sm" onClick={startEdit} data-testid="button-edit-case">Edit</Button>}
      </div>

      {editing ? (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editForm.status || ""} onValueChange={v => setEditForm({...editForm, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Open", "In Progress", "Closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Risk Level</Label>
                <Select value={editForm.riskLevel || ""} onValueChange={v => setEditForm({...editForm, riskLevel: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Low","Medium","High"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bucket</Label>
                <Select value={editForm.bucket || ""} onValueChange={v => setEditForm({...editForm, bucket: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Pemeriksaan Pengaduan Baru","Disetujui untuk Perdamaian","Tidak Disetujui untuk Perdamaian","Menunggu Pemeriksaan","Proses Negosiasi / Mediasi","Proses Regulator","Deadlock","Closed"].map(b =>
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Temuan</Label>
              <Textarea value={editForm.findings || ""} onChange={e => setEditForm({...editForm, findings: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label>Root Cause</Label>
              <Textarea value={editForm.rootCause || ""} onChange={e => setEditForm({...editForm, rootCause: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tindakan Terakhir</Label>
                <Textarea value={editForm.latestAction || ""} onChange={e => setEditForm({...editForm, latestAction: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Tindak Lanjut</Label>
                <Textarea value={editForm.nextAction || ""} onChange={e => setEditForm({...editForm, nextAction: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => updateMutation.mutate(editForm)} disabled={updateMutation.isPending}>Simpan</Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="detail" className="space-y-4">
          <TabsList>
            <TabsTrigger value="detail" data-testid="tab-detail">Detail</TabsTrigger>
            <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline ({caseUpdates?.length || 0})</TabsTrigger>
            <TabsTrigger value="comments" data-testid="tab-comments">Komentar ({commentsData?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="detail">
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="md:col-span-2">
                <CardContent className="p-4 space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Inti Pengaduan</p>
                    <p className="text-sm">{caseData.summary}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Workflow Stage</p>
                      <p className="text-sm font-medium">{caseData.workflowStage}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Bucket</p>
                      <p className="text-sm font-medium">{caseData.bucket}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cabang</p>
                      <p className="text-sm">{caseData.branch || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">No. Akun</p>
                      <p className="text-sm">{caseData.accountNumber || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Progress</p>
                    <div className="flex items-center gap-3">
                      <Progress value={caseData.progress} className="h-2 flex-1" />
                      <span className="text-sm font-medium">{caseData.progress}%</span>
                    </div>
                  </div>
                  {caseData.findings && <div><p className="text-xs text-muted-foreground mb-1">Temuan</p><p className="text-sm">{caseData.findings}</p></div>}
                  {caseData.rootCause && <div><p className="text-xs text-muted-foreground mb-1">Root Cause</p><p className="text-sm">{caseData.rootCause}</p></div>}
                  {caseData.customerRequest && <div><p className="text-xs text-muted-foreground mb-1">Permintaan Nasabah</p><p className="text-sm">{caseData.customerRequest}</p></div>}
                  {caseData.companyOffer && <div><p className="text-xs text-muted-foreground mb-1">Penawaran Perusahaan</p><p className="text-sm">{caseData.companyOffer}</p></div>}
                  {caseData.latestAction && <div><p className="text-xs text-muted-foreground mb-1">Tindakan Terakhir</p><p className="text-sm">{caseData.latestAction}</p></div>}
                  {caseData.nextAction && <div><p className="text-xs text-muted-foreground mb-1">Tindak Lanjut</p><p className="text-sm">{caseData.nextAction}</p></div>}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div><p className="text-xs text-muted-foreground">PIC Utama</p><p className="text-sm font-medium">{caseData.picMain || "-"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Dibuat oleh</p><p className="text-sm">{getUserName(caseData.createdBy)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Tanggal Masuk</p><p className="text-sm">{caseData.dateReceived}</p></div>
                  <div><p className="text-xs text-muted-foreground">Target Penyelesaian</p><p className="text-sm">{caseData.targetDate || "-"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Terakhir Diupdate</p><p className="text-sm">{new Date(caseData.updatedAt).toLocaleDateString("id-ID")}</p></div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardContent className="p-4 space-y-4">
                {canUpdate && (
                  <div className="p-3 bg-muted/50 rounded-md space-y-3">
                    <p className="text-sm font-medium">Tambah Update Progress</p>
                    <Textarea data-testid="input-update-content" placeholder="Isi update..." value={updateContent} onChange={e => setUpdateContent(e.target.value)} />
                    <div className="grid grid-cols-2 gap-3">
                      <Select value={newStage} onValueChange={setNewStage}>
                        <SelectTrigger><SelectValue placeholder="Stage baru (opsional)" /></SelectTrigger>
                        <SelectContent>{WORKFLOW_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input data-testid="input-update-progress" type="number" min={0} max={100} placeholder="Progress % baru" value={newProgress ?? ""} onChange={e => setNewProgress(e.target.value ? parseInt(e.target.value) : undefined)} />
                    </div>
                    <Button data-testid="button-submit-update" size="sm" onClick={() => {
                      if (!updateContent.trim()) return;
                      caseUpdateMutation.mutate({ content: updateContent, newStage: newStage || null, newProgress: newProgress ?? null });
                    }} disabled={caseUpdateMutation.isPending}>Tambah Update</Button>
                  </div>
                )}
                {caseUpdates?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Belum ada update</p>}
                <div className="space-y-3">
                  {caseUpdates?.map(u => (
                    <div key={u.id} className="p-3 bg-muted/30 rounded-md space-y-1" data-testid={`update-${u.id}`}>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(u.createdAt).toLocaleString("id-ID")}</span>
                        <span className="font-medium">{getUserName(u.createdBy)}</span>
                      </div>
                      <p className="text-sm">{u.content}</p>
                      {u.newStage && <p className="text-xs text-blue-600 dark:text-blue-400">Stage: {u.newStage}</p>}
                      {u.newProgress !== null && <p className="text-xs text-emerald-600 dark:text-emerald-400">Progress: {u.newProgress}%</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments">
            <Card>
              <CardContent className="p-4 space-y-3">
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
                  <Textarea data-testid="input-comment" placeholder="Tulis komentar..." value={commentText} onChange={e => setCommentText(e.target.value)} className="flex-1 min-h-[60px]" />
                  <Button data-testid="button-send-comment" size="icon" onClick={() => {
                    if (!commentText.trim()) return;
                    commentMutation.mutate({ entityType: "case", entityId: id, content: commentText });
                  }} disabled={commentMutation.isPending || !commentText.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
