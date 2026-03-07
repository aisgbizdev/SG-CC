import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { usePageTitle } from "@/hooks/use-page-title";
import { QueryError } from "@/components/query-error";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart3, Plus, User, Building2, Target, CheckCircle2,
  Activity, FileWarning, ListTodo, TrendingUp, Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { KpiAssessment, User as UserType, Company } from "@shared/schema";

function ScoreCircle({ score, label, size = "md" }: { score: number; label: string; size?: "sm" | "md" }) {
  const color = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600";
  const bg = score >= 80 ? "bg-emerald-50 dark:bg-emerald-900/20" : score >= 60 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-red-50 dark:bg-red-900/20";
  const sz = size === "sm" ? "w-14 h-14" : "w-20 h-20";
  const textSz = size === "sm" ? "text-lg" : "text-2xl";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${sz} ${bg} rounded-full flex items-center justify-center`}>
        <span className={`${textSz} font-bold ${color}`}>{score}</span>
      </div>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
}

function getQuarterOptions() {
  const currentYear = new Date().getFullYear();
  const options: string[] = [];
  for (let y = currentYear; y >= currentYear - 1; y--) {
    for (let q = 4; q >= 1; q--) {
      options.push(`${y}-Q${q}`);
    }
  }
  return options;
}

export default function KpiPage() {
  usePageTitle("Penilaian KPI");
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterCompany, setFilterCompany] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(getQuarterOptions()[0]);
  const [autoScores, setAutoScores] = useState<any>(null);
  const [qualityScore, setQualityScore] = useState(70);
  const [timelinessScore, setTimelinessScore] = useState(70);
  const [initiativeScore, setInitiativeScore] = useState(70);
  const [notes, setNotes] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);

  const isAdmin = ["superadmin", "owner"].includes(user?.role || "");

  const { data: kpiData, isLoading, isError, refetch } = useQuery<KpiAssessment[]>({
    queryKey: ["/api/kpi"],
  });

  const { data: usersData } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });

  const { data: companiesData } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const duDkUsers = usersData?.filter(u => ["du", "dk"].includes(u.role)) || [];

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/kpi", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpi"] });
      toast({ title: "KPI berhasil disimpan" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: "Gagal menyimpan KPI", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setSelectedUserId("");
    setSelectedPeriod(getQuarterOptions()[0]);
    setAutoScores(null);
    setQualityScore(70);
    setTimelinessScore(70);
    setInitiativeScore(70);
    setNotes("");
  };

  const handleCalculate = async () => {
    if (!selectedUserId || !selectedPeriod) return;
    setIsCalculating(true);
    try {
      const res = await apiRequest("GET", `/api/kpi/calculate/${selectedUserId}?period=${selectedPeriod}`);
      const data = await res.json();
      setAutoScores(data);
    } catch {
      toast({ title: "Gagal menghitung skor otomatis", variant: "destructive" });
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateTotal = () => {
    if (!autoScores) return 0;
    const totalItems = (autoScores.activitiesTotal || 0) + (autoScores.casesTotal || 0) + (autoScores.tasksTotal || 0);
    const completedItems = (autoScores.activitiesCompleted || 0) + (autoScores.casesCompleted || 0) + (autoScores.tasksCompleted || 0);
    const completionRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
    const autoScore = (completionRate * 0.5 + (autoScores.avgProgress || 0) * 0.5);
    const manualScore = (qualityScore + timelinessScore + initiativeScore) / 3;
    return Math.round(autoScore * 0.7 + manualScore * 0.3);
  };

  const handleSubmit = () => {
    if (!selectedUserId || !autoScores) return;
    const totalScore = calculateTotal();
    createMutation.mutate({
      userId: parseInt(selectedUserId),
      period: selectedPeriod,
      activitiesCompleted: autoScores.activitiesCompleted,
      activitiesTotal: autoScores.activitiesTotal,
      casesCompleted: autoScores.casesCompleted,
      casesTotal: autoScores.casesTotal,
      tasksCompleted: autoScores.tasksCompleted,
      tasksTotal: autoScores.tasksTotal,
      avgProgress: autoScores.avgProgress,
      qualityScore,
      timelinessScore,
      initiativeScore,
      totalScore,
      notes: notes || null,
    });
  };

  const getCompanyName = (companyId: number | null) => companiesData?.find(c => c.id === companyId)?.code || "-";
  const getUserName = (userId: number) => {
    if (!isAdmin && user && userId === user.id) return user.fullName;
    return usersData?.find(u => u.id === userId)?.fullName || "-";
  };
  const getUserRole = (userId: number) => {
    if (!isAdmin && user && userId === user.id) {
      return user.role === "du" ? "DU" : user.role === "dk" ? "DK" : user.role.toUpperCase();
    }
    const u = usersData?.find(u2 => u2.id === userId);
    return u?.role === "du" ? "DU" : u?.role === "dk" ? "DK" : u?.role?.toUpperCase() || "-";
  };
  const getUserCompanyId = (userId: number) => {
    if (!isAdmin && user && userId === user.id) return user.companyId;
    return usersData?.find(u => u.id === userId)?.companyId || null;
  };

  const filteredKpi = (kpiData || []).filter(k => {
    const matchPeriod = filterPeriod === "all" || k.period === filterPeriod;
    const matchCompany = filterCompany === "all" || getUserCompanyId(k.userId)?.toString() === filterCompany;
    return matchPeriod && matchCompany;
  });

  const scoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Baik</Badge>;
    if (score >= 60) return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Cukup</Badge>;
    return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Kurang</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-3 sm:p-6 max-w-7xl mx-auto">
        <QueryError message="Gagal memuat data KPI." onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-kpi-title">Penilaian KPI</h1>
          <p className="text-sm text-muted-foreground">Penilaian kinerja DU & DK berdasarkan aktivitas, kasus, dan tugas</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="button-tambah-kpi">
            <Plus className="w-4 h-4 mr-1" /> Nilai KPI
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-36" data-testid="select-filter-period">
            <SelectValue placeholder="Periode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Periode</SelectItem>
            {getQuarterOptions().map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
          </SelectContent>
        </Select>
        {isAdmin && (
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="w-36" data-testid="select-filter-company">
              <SelectValue placeholder="PT" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua PT</SelectItem>
              {companiesData?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.code}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {filteredKpi.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground" data-testid="text-empty-kpi">Belum ada penilaian KPI</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredKpi.map(kpi => (
            <Card key={kpi.id} data-testid={`card-kpi-${kpi.id}`}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold text-sm" data-testid={`text-kpi-name-${kpi.id}`}>
                          {isAdmin ? getUserName(kpi.userId) : user?.fullName}
                        </span>
                      </div>
                      <Badge variant="outline">{getUserRole(kpi.userId)}</Badge>
                      <Badge variant="outline">
                        <Building2 className="w-3 h-3 mr-1" />
                        {getCompanyName(getUserCompanyId(kpi.userId))}
                      </Badge>
                      <Badge variant="secondary">{kpi.period}</Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3 text-blue-500" />
                        <span>Aktivitas: {kpi.activitiesCompleted}/{kpi.activitiesTotal}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileWarning className="w-3 h-3 text-amber-500" />
                        <span>Kasus: {kpi.casesCompleted}/{kpi.casesTotal}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ListTodo className="w-3 h-3 text-purple-500" />
                        <span>Tugas: {kpi.tasksCompleted}/{kpi.tasksTotal}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Kualitas: {kpi.qualityScore}</span>
                      <span>Ketepatan: {kpi.timelinessScore}</span>
                      <span>Inisiatif: {kpi.initiativeScore}</span>
                      <span>Avg Progress: {kpi.avgProgress}%</span>
                    </div>

                    {kpi.notes && (
                      <p className="text-xs text-muted-foreground italic">"{kpi.notes}"</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <ScoreCircle score={kpi.totalScore} label="Skor Total" />
                    {scoreBadge(kpi.totalScore)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Penilaian KPI Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pegawai (DU/DK)</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger data-testid="select-kpi-user">
                    <SelectValue placeholder="Pilih pegawai" />
                  </SelectTrigger>
                  <SelectContent>
                    {duDkUsers.map(u => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.fullName} ({u.role.toUpperCase()}) - {getCompanyName(u.companyId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Periode</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger data-testid="select-kpi-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getQuarterOptions().map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={handleCalculate}
              disabled={!selectedUserId || isCalculating}
              className="w-full"
              data-testid="button-calculate-kpi"
            >
              {isCalculating ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Target className="w-4 h-4 mr-2" />
              )}
              Hitung Skor Otomatis
            </Button>

            {autoScores && (
              <>
                <Card className="bg-muted/50">
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" /> Skor Otomatis (70%)
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center space-y-1">
                        <Activity className="w-5 h-5 text-blue-500 mx-auto" />
                        <p className="text-lg font-bold">{autoScores.activitiesCompleted}/{autoScores.activitiesTotal}</p>
                        <p className="text-xs text-muted-foreground">Aktivitas</p>
                      </div>
                      <div className="text-center space-y-1">
                        <FileWarning className="w-5 h-5 text-amber-500 mx-auto" />
                        <p className="text-lg font-bold">{autoScores.casesCompleted}/{autoScores.casesTotal}</p>
                        <p className="text-xs text-muted-foreground">Kasus</p>
                      </div>
                      <div className="text-center space-y-1">
                        <ListTodo className="w-5 h-5 text-purple-500 mx-auto" />
                        <p className="text-lg font-bold">{autoScores.tasksCompleted}/{autoScores.tasksTotal}</p>
                        <p className="text-xs text-muted-foreground">Tugas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Rata-rata Progress:</span>
                      <Progress value={autoScores.avgProgress} className="flex-1 h-2" />
                      <span className="text-xs font-medium">{autoScores.avgProgress}%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h4 className="font-semibold text-sm flex items-center gap-1">
                      <Star className="w-4 h-4" /> Penilaian Manual (30%)
                    </h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Kualitas Kerja</Label>
                          <span className="text-xs font-medium">{qualityScore}/100</span>
                        </div>
                        <Input
                          type="range"
                          min="0"
                          max="100"
                          value={qualityScore}
                          onChange={e => setQualityScore(parseInt(e.target.value))}
                          className="h-2"
                          data-testid="input-quality-score"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Ketepatan Waktu</Label>
                          <span className="text-xs font-medium">{timelinessScore}/100</span>
                        </div>
                        <Input
                          type="range"
                          min="0"
                          max="100"
                          value={timelinessScore}
                          onChange={e => setTimelinessScore(parseInt(e.target.value))}
                          className="h-2"
                          data-testid="input-timeliness-score"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Inisiatif & Proaktif</Label>
                          <span className="text-xs font-medium">{initiativeScore}/100</span>
                        </div>
                        <Input
                          type="range"
                          min="0"
                          max="100"
                          value={initiativeScore}
                          onChange={e => setInitiativeScore(parseInt(e.target.value))}
                          className="h-2"
                          data-testid="input-initiative-score"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label>Catatan (Opsional)</Label>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Catatan penilaian..."
                    rows={2}
                    data-testid="input-kpi-notes"
                  />
                </div>

                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Skor Total</p>
                      <p className="text-xs text-muted-foreground">Otomatis 70% + Manual 30%</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <ScoreCircle score={calculateTotal()} label="" size="sm" />
                      {scoreBadge(calculateTotal())}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedUserId || !autoScores || createMutation.isPending}
              data-testid="button-submit-kpi"
            >
              {createMutation.isPending ? "Menyimpan..." : "Simpan Penilaian"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
