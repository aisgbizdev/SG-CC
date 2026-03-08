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
import { Badge } from "@/components/ui/badge";
import { StatusBadge, RiskBadge } from "@/components/status-badges";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, MessageSquare, Send, User, Clock, FileText, Trash2, CalendarDays, MapPin, Users } from "lucide-react";
import { useLocation as useWouterLocation } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";
import type { Case, CaseUpdate, Comment, CaseMeeting } from "@shared/schema";

const WORKFLOW_STAGES = ["Open", "Pemeriksaan Internal", "Review", "Negosiasi", "Proses Regulator", "Settlement / Deadlock", "Closed"];
const MEETING_TYPES = ["Mediasi Nasabah", "Musyawarah Pialang", "Mediasi BBJ", "Sidang Bappebti", "Negosiasi Internal", "Lainnya"];
const RESOLUTION_PATHS = ["Belum Ditentukan", "Mediasi Internal", "Mediasi BBJ", "Sidang Bappebti", "BAKTI", "Pengadilan", "Kepolisian"];

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

  const [meetingForm, setMeetingForm] = useState({
    meetingDate: "",
    meetingType: "",
    participants: "",
    location: "",
    result: "",
    notes: "",
  });

  const { data: caseData, isLoading } = useQuery<Case>({ queryKey: ["/api/cases", id] });
  usePageTitle(caseData?.caseCode ? `${caseData.caseCode} - Kasus` : "Detail Kasus");
  const { data: caseUpdates } = useQuery<CaseUpdate[]>({ queryKey: ["/api/cases", id, "updates"] });
  const { data: commentsData } = useQuery<Comment[]>({ queryKey: ["/api/comments", "case", id] });
  const { data: meetingsData } = useQuery<CaseMeeting[]>({ queryKey: ["/api/cases", id, "meetings"] });
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

  const meetingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/cases/${id}/meetings`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id, "meetings"] });
      setMeetingForm({ meetingDate: "", meetingType: "", participants: "", location: "", result: "", notes: "" });
      toast({ title: "Berhasil", description: "Pertemuan ditambahkan" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal menambahkan pertemuan", variant: "destructive" });
    },
  });

  const deleteMeetingMutation = useMutation({
    mutationFn: async (meetingId: number) => {
      await apiRequest("DELETE", `/api/meetings/${meetingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id, "meetings"] });
      toast({ title: "Berhasil", description: "Pertemuan dihapus" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal menghapus", variant: "destructive" });
    },
  });

  const getUserName = (userId: number) => usersData?.find((u: any) => u.id === userId)?.fullName || "Unknown";
  const getCompanyName = (companyId: number) => companiesData?.find((c: any) => c.id === companyId)?.name || "-";

  const [, setLocation] = useWouterLocation();
  const canEdit = user?.role === "superadmin" || (["du", "dk"].includes(user?.role || "") && caseData?.createdBy === user?.id);
  const canUpdate = ["superadmin", "du", "dk"].includes(user?.role || "");
  const canDelete = ["superadmin", "owner"].includes(user?.role || "") || caseData?.createdBy === user?.id;
  const canDeleteMeeting = (createdBy: number) => user?.role === "superadmin" || createdBy === user?.id;

  const deleteMutation = useMutation({
    mutationFn: async () => { await apiRequest("DELETE", `/api/cases/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Berhasil", description: "Kasus berhasil dihapus" });
      setLocation("/kasus");
    },
    onError: (err: any) => { toast({ title: "Gagal", description: err.message || "Gagal menghapus", variant: "destructive" }); },
  });

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;
  if (!caseData) return <div className="p-6"><p className="text-muted-foreground">Kasus tidak ditemukan</p></div>;

  const startEdit = () => {
    setEditForm({
      customerName: caseData.customerName,
      accountNumber: caseData.accountNumber,
      branch: caseData.branch,
      picMain: caseData.picMain,
      wpbName: caseData.wpbName,
      managerName: caseData.managerName,
      summary: caseData.summary,
      workflowStage: caseData.workflowStage,
      progress: caseData.progress,
      targetDate: caseData.targetDate,
      customerRequest: caseData.customerRequest,
      companyOffer: caseData.companyOffer,
      status: caseData.status,
      riskLevel: caseData.riskLevel,
      bucket: caseData.bucket,
      findings: caseData.findings,
      rootCause: caseData.rootCause,
      latestAction: caseData.latestAction,
      nextAction: caseData.nextAction,
      resolutionPath: caseData.resolutionPath,
    });
    setEditing(true);
  };

  const meetingCountByType = (meetingsData || []).reduce((acc: Record<string, number>, m) => {
    acc[m.meetingType] = (acc[m.meetingType] || 0) + 1;
    return acc;
  }, {});

  const meetingCountSummary = Object.entries(meetingCountByType)
    .map(([type, count]) => `${type}: ${count}x`)
    .join(", ");

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
        <div className="flex items-center gap-2">
          {canEdit && !editing && <Button size="sm" onClick={startEdit} data-testid="button-edit-case">Edit</Button>}
          {canDelete && !editing && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" data-testid="button-delete-case"><Trash2 className="w-4 h-4 mr-1" /> Hapus</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Kasus?</AlertDialogTitle>
                  <AlertDialogDescription>Kasus "{caseData.caseCode} - {caseData.customerName}" akan dihapus. Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {editing ? (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nama Nasabah</Label>
                <Input data-testid="input-edit-customer-name" value={editForm.customerName || ""} onChange={e => setEditForm({...editForm, customerName: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>No. Akun</Label>
                <Input data-testid="input-edit-account-number" value={editForm.accountNumber || ""} onChange={e => setEditForm({...editForm, accountNumber: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cabang</Label>
                <Input data-testid="input-edit-branch" value={editForm.branch || ""} onChange={e => setEditForm({...editForm, branch: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>PIC Utama / Marketing</Label>
                <Input data-testid="input-edit-pic-main" value={editForm.picMain || ""} onChange={e => setEditForm({...editForm, picMain: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>WPB</Label>
                <Input data-testid="input-edit-wpb" value={editForm.wpbName || ""} onChange={e => setEditForm({...editForm, wpbName: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Manager</Label>
                <Input data-testid="input-edit-manager" value={editForm.managerName || ""} onChange={e => setEditForm({...editForm, managerName: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Jalur Penyelesaian</Label>
              <Select value={editForm.resolutionPath || "Belum Ditentukan"} onValueChange={v => setEditForm({...editForm, resolutionPath: v})}>
                <SelectTrigger data-testid="select-edit-resolution"><SelectValue /></SelectTrigger>
                <SelectContent>{RESOLUTION_PATHS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Inti Pengaduan / Summary</Label>
              <Textarea data-testid="input-edit-summary" value={editForm.summary || ""} onChange={e => setEditForm({...editForm, summary: e.target.value})} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editForm.status || ""} onValueChange={v => setEditForm({...editForm, status: v})}>
                  <SelectTrigger data-testid="select-edit-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Open", "In Progress", "Closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Risk Level</Label>
                <Select value={editForm.riskLevel || ""} onValueChange={v => setEditForm({...editForm, riskLevel: v})}>
                  <SelectTrigger data-testid="select-edit-risk"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Low","Medium","High"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bucket</Label>
                <Select value={editForm.bucket || ""} onValueChange={v => setEditForm({...editForm, bucket: v})}>
                  <SelectTrigger data-testid="select-edit-bucket"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Pemeriksaan Pengaduan Baru","Disetujui untuk Perdamaian","Tidak Disetujui untuk Perdamaian","Menunggu Pemeriksaan","Proses Negosiasi / Mediasi","Proses Regulator","Deadlock","Closed"].map(b =>
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Workflow Stage</Label>
                <Select value={editForm.workflowStage || ""} onValueChange={v => setEditForm({...editForm, workflowStage: v})}>
                  <SelectTrigger data-testid="select-edit-stage"><SelectValue /></SelectTrigger>
                  <SelectContent>{WORKFLOW_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Progress (%)</Label>
                <Input data-testid="input-edit-progress" type="number" min={0} max={100} value={editForm.progress ?? 0} onChange={e => setEditForm({...editForm, progress: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-1.5">
                <Label>Target Penyelesaian</Label>
                <Input data-testid="input-edit-target-date" type="date" value={editForm.targetDate || ""} onChange={e => setEditForm({...editForm, targetDate: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Permintaan Nasabah</Label>
                <Textarea data-testid="input-edit-customer-request" value={editForm.customerRequest || ""} onChange={e => setEditForm({...editForm, customerRequest: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Penawaran Perusahaan</Label>
                <Textarea data-testid="input-edit-company-offer" value={editForm.companyOffer || ""} onChange={e => setEditForm({...editForm, companyOffer: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Temuan</Label>
              <Textarea data-testid="input-edit-findings" value={editForm.findings || ""} onChange={e => setEditForm({...editForm, findings: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label>Root Cause</Label>
              <Textarea data-testid="input-edit-root-cause" value={editForm.rootCause || ""} onChange={e => setEditForm({...editForm, rootCause: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tindakan Terakhir</Label>
                <Textarea data-testid="input-edit-latest-action" value={editForm.latestAction || ""} onChange={e => setEditForm({...editForm, latestAction: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Tindak Lanjut</Label>
                <Textarea data-testid="input-edit-next-action" value={editForm.nextAction || ""} onChange={e => setEditForm({...editForm, nextAction: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => updateMutation.mutate(editForm)} disabled={updateMutation.isPending} data-testid="button-save-edit">Simpan</Button>
              <Button variant="secondary" onClick={() => setEditing(false)} data-testid="button-cancel-edit">Batal</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="detail" className="space-y-4">
          <TabsList>
            <TabsTrigger value="detail" data-testid="tab-detail">Detail</TabsTrigger>
            <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline ({caseUpdates?.length || 0})</TabsTrigger>
            <TabsTrigger value="comments" data-testid="tab-comments">Komentar ({commentsData?.length || 0})</TabsTrigger>
            <TabsTrigger value="meetings" data-testid="tab-meetings">Pertemuan ({meetingsData?.length || 0})</TabsTrigger>
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
                    <div>
                      <p className="text-xs text-muted-foreground">WPB</p>
                      <p className="text-sm" data-testid="text-wpb">{caseData.wpbName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Manager</p>
                      <p className="text-sm" data-testid="text-manager">{caseData.managerName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Jalur Penyelesaian</p>
                      <Badge variant={caseData.resolutionPath === "Belum Ditentukan" ? "secondary" : "default"} className="mt-0.5" data-testid="text-resolution-path">{caseData.resolutionPath || "Belum Ditentukan"}</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Progress</p>
                    <div className="flex items-center gap-3">
                      <Progress value={caseData.progress} className="h-2 flex-1" />
                      <span className="text-sm font-medium">{caseData.progress}%</span>
                    </div>
                  </div>
                  {meetingCountSummary && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Ringkasan Pertemuan</p>
                      <p className="text-sm" data-testid="text-meeting-summary">{meetingCountSummary}</p>
                    </div>
                  )}
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

          <TabsContent value="meetings">
            <Card>
              <CardContent className="p-4 space-y-4">
                {Object.keys(meetingCountByType).length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap" data-testid="meeting-type-counts">
                    {Object.entries(meetingCountByType).map(([type, count]) => (
                      <Badge key={type} variant="secondary" className="text-xs" data-testid={`badge-meeting-type-${type}`}>
                        {type}: {count}x
                      </Badge>
                    ))}
                  </div>
                )}

                {canUpdate && (
                  <div className="p-3 bg-muted/50 rounded-md space-y-3">
                    <p className="text-sm font-medium">Tambah Pertemuan</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Tanggal</Label>
                        <Input data-testid="input-meeting-date" type="date" value={meetingForm.meetingDate} onChange={e => setMeetingForm({...meetingForm, meetingDate: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Jenis Pertemuan</Label>
                        <Select value={meetingForm.meetingType} onValueChange={v => setMeetingForm({...meetingForm, meetingType: v})}>
                          <SelectTrigger data-testid="select-meeting-type"><SelectValue placeholder="Pilih jenis..." /></SelectTrigger>
                          <SelectContent>
                            {MEETING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Peserta</Label>
                        <Input data-testid="input-meeting-participants" placeholder="Nama peserta..." value={meetingForm.participants} onChange={e => setMeetingForm({...meetingForm, participants: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Lokasi</Label>
                        <Input data-testid="input-meeting-location" placeholder="Lokasi pertemuan..." value={meetingForm.location} onChange={e => setMeetingForm({...meetingForm, location: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Hasil</Label>
                      <Textarea data-testid="input-meeting-result" placeholder="Hasil pertemuan..." value={meetingForm.result} onChange={e => setMeetingForm({...meetingForm, result: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Catatan</Label>
                      <Textarea data-testid="input-meeting-notes" placeholder="Catatan tambahan..." value={meetingForm.notes} onChange={e => setMeetingForm({...meetingForm, notes: e.target.value})} />
                    </div>
                    <Button data-testid="button-submit-meeting" size="sm" onClick={() => {
                      if (!meetingForm.meetingDate || !meetingForm.meetingType) {
                        toast({ title: "Error", description: "Tanggal dan jenis pertemuan wajib diisi", variant: "destructive" });
                        return;
                      }
                      meetingMutation.mutate({
                        caseId: id,
                        meetingDate: meetingForm.meetingDate,
                        meetingType: meetingForm.meetingType,
                        participants: meetingForm.participants || null,
                        location: meetingForm.location || null,
                        result: meetingForm.result || null,
                        notes: meetingForm.notes || null,
                        createdBy: user!.id,
                      });
                    }} disabled={meetingMutation.isPending}>Tambah Pertemuan</Button>
                  </div>
                )}

                {(!meetingsData || meetingsData.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">Belum ada pertemuan</p>
                )}

                <div className="space-y-3">
                  {[...(meetingsData || [])].sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime()).map(m => (
                    <div key={m.id} className="p-3 bg-muted/30 rounded-md space-y-2" data-testid={`meeting-${m.id}`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays className="w-3 h-3" />
                            <span>{new Date(m.meetingDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                          </div>
                          <Badge variant="outline" className="text-xs" data-testid={`badge-meeting-${m.id}`}>{m.meetingType}</Badge>
                        </div>
                        {canDeleteMeeting(m.createdBy) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-delete-meeting-${m.id}`}>
                                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Pertemuan?</AlertDialogTitle>
                                <AlertDialogDescription>Pertemuan ini akan dihapus. Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMeetingMutation.mutate(m.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                      {m.participants && (
                        <div className="flex items-start gap-1.5 text-sm">
                          <Users className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                          <span>{m.participants}</span>
                        </div>
                      )}
                      {m.location && (
                        <div className="flex items-start gap-1.5 text-sm">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                          <span>{m.location}</span>
                        </div>
                      )}
                      {m.result && (
                        <div>
                          <p className="text-xs text-muted-foreground">Hasil</p>
                          <p className="text-sm">{m.result}</p>
                        </div>
                      )}
                      {m.notes && (
                        <div>
                          <p className="text-xs text-muted-foreground">Catatan</p>
                          <p className="text-sm">{m.notes}</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">Dibuat oleh: {getUserName(m.createdBy)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
