import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { usePageTitle } from "@/hooks/use-page-title";
import { QueryError } from "@/components/query-error";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart3, Plus, User, Building2, Target,
  Activity, FileWarning, ListTodo, TrendingUp,
  Clock, Zap, Briefcase, BarChart2, ChevronDown, ChevronUp,
  Award, ThumbsUp, AlertTriangle, BookOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { KpiAssessment, User as UserType, Company } from "@shared/schema";

const ASPECT_LABELS = [
  { key: "penyelesaianTugas", label: "Penyelesaian Tugas", icon: ListTodo, color: "text-purple-500", desc: "% tugas selesai dari total" },
  { key: "penyelesaianKasus", label: "Penyelesaian Kasus", icon: FileWarning, color: "text-amber-500", desc: "% kasus closed dari total" },
  { key: "penyelesaianAktivitas", label: "Penyelesaian Aktivitas", icon: Activity, color: "text-blue-500", desc: "% aktivitas selesai dari total" },
  { key: "ketepatanWaktu", label: "Ketepatan Waktu", icon: Clock, color: "text-green-500", desc: "% selesai sebelum deadline" },
  { key: "progressRataRata", label: "Progress Rata-rata", icon: TrendingUp, color: "text-cyan-500", desc: "Rata-rata progress semua item" },
  { key: "responsivitas", label: "Responsivitas", icon: Zap, color: "text-orange-500", desc: "Kecepatan menangani item (tanpa overdue)" },
  { key: "bebanKerja", label: "Beban Kerja", icon: Briefcase, color: "text-indigo-500", desc: "Kapasitas item yang ditangani" },
  { key: "konsistensi", label: "Konsistensi", icon: BarChart2, color: "text-pink-500", desc: "Rasio penyelesaian terhadap total" },
] as const;

function getGrade(score: number) {
  if (score >= 85) return { grade: "A", label: "Sangat Baik", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
  if (score >= 70) return { grade: "B", label: "Baik", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
  if (score >= 55) return { grade: "C", label: "Cukup", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
  return { grade: "D", label: "Perlu Perbaikan", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
}

function RadarChart({ scores, size = 200 }: { scores: Record<string, number>; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const n = ASPECT_LABELS.length;

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    const dist = (value / 100) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  const gridLevels = [20, 40, 60, 80, 100];
  const labelRadius = r + 18;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {gridLevels.map(level => (
        <polygon
          key={level}
          points={ASPECT_LABELS.map((_, i) => {
            const p = getPoint(i, level);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeWidth={1}
        />
      ))}

      {ASPECT_LABELS.map((_, i) => {
        const p = getPoint(i, 100);
        return (
          <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="currentColor" strokeOpacity={0.1} strokeWidth={1} />
        );
      })}

      <polygon
        points={ASPECT_LABELS.map((a, i) => {
          const p = getPoint(i, scores[a.key] || 0);
          return `${p.x},${p.y}`;
        }).join(" ")}
        fill="hsl(220, 85%, 50%)"
        fillOpacity={0.2}
        stroke="hsl(220, 85%, 50%)"
        strokeWidth={2}
      />

      {ASPECT_LABELS.map((a, i) => {
        const p = getPoint(i, scores[a.key] || 0);
        return (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="hsl(220, 85%, 50%)" />
        );
      })}

      {ASPECT_LABELS.map((a, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + labelRadius * Math.cos(angle);
        const ly = cy + labelRadius * Math.sin(angle);
        const anchor = lx < cx - 5 ? "end" : lx > cx + 5 ? "start" : "middle";
        return (
          <text key={i} x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle" className="fill-muted-foreground" fontSize={size > 180 ? 9 : 7}>
            {a.label.split(" ").length > 1 ? a.label.split(" ")[0] : a.label}
          </text>
        );
      })}
    </svg>
  );
}

function ScoreCircle({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const { grade, className } = getGrade(score);
  const sz = size === "sm" ? "w-12 h-12" : size === "lg" ? "w-24 h-24" : "w-16 h-16";
  const textSz = size === "sm" ? "text-sm" : size === "lg" ? "text-3xl" : "text-xl";
  const gradeSz = size === "sm" ? "text-[10px]" : size === "lg" ? "text-sm" : "text-xs";
  const color = score >= 85 ? "text-emerald-600" : score >= 70 ? "text-blue-600" : score >= 55 ? "text-amber-600" : "text-red-600";
  const bg = score >= 85 ? "bg-emerald-50 dark:bg-emerald-900/20" : score >= 70 ? "bg-blue-50 dark:bg-blue-900/20" : score >= 55 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-red-50 dark:bg-red-900/20";
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={`${sz} ${bg} rounded-full flex flex-col items-center justify-center`}>
        <span className={`${textSz} font-bold ${color}`}>{score}</span>
        <span className={`${gradeSz} font-semibold ${color}`}>{grade}</span>
      </div>
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

type LiveKpi = {
  userId: number;
  fullName: string;
  role: string;
  companyId: number | null;
  scores: Record<string, number>;
  totalScore: number;
  details: {
    activitiesTotal: number;
    activitiesCompleted: number;
    casesTotal: number;
    casesCompleted: number;
    tasksTotal: number;
    tasksCompleted: number;
    avgProgress: number;
    totalOverdue: number;
    totalOnTime: number;
    totalWithDeadline: number;
    totalItems: number;
  };
};

export default function KpiPage() {
  usePageTitle("Penilaian KPI");
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"live" | "history">("live");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedLiveId, setExpandedLiveId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(getQuarterOptions()[0]);
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [notes, setNotes] = useState("");

  const isAdmin = ["superadmin", "owner"].includes(user?.role || "");

  const { data: liveData, isLoading: liveLoading, isError: liveError, refetch: liveRefetch } = useQuery<LiveKpi[]>({
    queryKey: ["/api/kpi/live"],
    refetchInterval: 60000,
  });

  const { data: historyData, isLoading: histLoading, isError: histError, refetch: histRefetch } = useQuery<KpiAssessment[]>({
    queryKey: ["/api/kpi"],
  });

  const { data: companiesData } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: usersData } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/kpi", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpi"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kpi/live"] });
      toast({ title: "Penilaian kuartal berhasil disimpan" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: "Gagal menyimpan", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setSelectedUserId("");
    setSelectedPeriod(getQuarterOptions()[0]);
    setStrengths("");
    setImprovements("");
    setNotes("");
  };

  const handleSubmit = () => {
    if (!selectedUserId) return;
    createMutation.mutate({
      userId: parseInt(selectedUserId),
      period: selectedPeriod,
      strengths: strengths || null,
      improvements: improvements || null,
      notes: notes || null,
    });
  };

  const getCompanyName = (companyId: number | null) => companiesData?.find(c => c.id === companyId)?.code || "-";
  const getUserName = (userId: number) => {
    if (!isAdmin && user && userId === user.id) return user.fullName;
    return usersData?.find(u => u.id === userId)?.fullName || "-";
  };
  const getUserRole = (userId: number) => {
    if (!isAdmin && user && userId === user.id) return user.role === "du" ? "DU" : "DK";
    const u = usersData?.find(u2 => u2.id === userId);
    return u?.role === "du" ? "DU" : u?.role === "dk" ? "DK" : u?.role?.toUpperCase() || "-";
  };
  const getUserCompanyId = (userId: number) => {
    if (!isAdmin && user && userId === user.id) return user.companyId;
    return usersData?.find(u => u.id === userId)?.companyId || null;
  };

  const filteredLive = (liveData || []).filter(k => {
    return filterCompany === "all" || k.companyId?.toString() === filterCompany;
  });

  const filteredHistory = (historyData || []).filter(k => {
    const matchPeriod = filterPeriod === "all" || k.period === filterPeriod;
    const matchCompany = filterCompany === "all" || getUserCompanyId(k.userId)?.toString() === filterCompany;
    return matchPeriod && matchCompany;
  });

  const duDkUsers = usersData?.filter(u => ["du", "dk"].includes(u.role) && u.isActive) || [];

  const isLoading = activeTab === "live" ? liveLoading : histLoading;
  const isError = activeTab === "live" ? liveError : histError;
  const refetch = activeTab === "live" ? liveRefetch : histRefetch;

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
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

  const historyScoresFromKpi = (kpi: KpiAssessment) => ({
    penyelesaianAktivitas: kpi.qualityScore,
    ketepatanWaktu: kpi.timelinessScore,
    responsivitas: kpi.initiativeScore,
    penyelesaianKasus: kpi.communicationScore,
    penyelesaianTugas: kpi.regulationScore,
    progressRataRata: kpi.problemSolvingScore,
    bebanKerja: kpi.teamworkScore,
    konsistensi: kpi.responsibilityScore,
  });

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-kpi-title">Penilaian KPI</h1>
          <p className="text-sm text-muted-foreground">Monitoring performa DU & DK secara real-time</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="button-tambah-kpi">
            <Plus className="w-4 h-4 mr-1" /> Simpan Penilaian Kuartal
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab("live")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "live" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            data-testid="tab-kpi-live"
          >
            <Zap className="w-3.5 h-3.5 inline mr-1" />
            KPI Live
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "history" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            data-testid="tab-kpi-history"
          >
            <BookOpen className="w-3.5 h-3.5 inline mr-1" />
            Riwayat Kuartal
          </button>
        </div>

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

        {activeTab === "history" && (
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-36" data-testid="select-filter-period">
              <SelectValue placeholder="Periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Periode</SelectItem>
              {getQuarterOptions().map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {activeTab === "live" && (
        <>
          {filteredLive.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground" data-testid="text-empty-live">Belum ada data KPI</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {[...filteredLive].sort((a, b) => b.totalScore - a.totalScore).map((kpi, idx) => {
                const { grade, label, className: gradeCls } = getGrade(kpi.totalScore);
                const isExpanded = expandedLiveId === kpi.userId;
                return (
                  <Card key={kpi.userId} data-testid={`card-live-kpi-${kpi.userId}`} className="overflow-hidden">
                    <CardContent className="p-0">
                      <button
                        className="w-full p-4 text-left flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-muted/30 transition-colors"
                        onClick={() => setExpandedLiveId(isExpanded ? null : kpi.userId)}
                        data-testid={`button-expand-live-${kpi.userId}`}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground w-8">
                          #{idx + 1}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-semibold" data-testid={`text-live-name-${kpi.userId}`}>{kpi.fullName}</span>
                            </div>
                            <Badge variant="outline">{kpi.role === "du" ? "DU" : "DK"}</Badge>
                            <Badge variant="outline">
                              <Building2 className="w-3 h-3 mr-1" />
                              {getCompanyName(kpi.companyId)}
                            </Badge>
                            <Badge className={gradeCls}>{grade} - {label}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {kpi.details.activitiesCompleted}/{kpi.details.activitiesTotal} aktivitas</span>
                            <span className="flex items-center gap-1"><FileWarning className="w-3 h-3" /> {kpi.details.casesCompleted}/{kpi.details.casesTotal} kasus</span>
                            <span className="flex items-center gap-1"><ListTodo className="w-3 h-3" /> {kpi.details.tasksCompleted}/{kpi.details.tasksTotal} tugas</span>
                            {kpi.details.totalOverdue > 0 && (
                              <span className="flex items-center gap-1 text-red-500"><AlertTriangle className="w-3 h-3" /> {kpi.details.totalOverdue} overdue</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <ScoreCircle score={kpi.totalScore} size="sm" />
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t px-4 py-4 space-y-4 bg-muted/10">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="text-sm font-semibold mb-3 flex items-center gap-1">
                                <Target className="w-4 h-4" /> Radar Kompetensi
                              </h4>
                              <RadarChart scores={kpi.scores} size={220} />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold mb-3 flex items-center gap-1">
                                <BarChart3 className="w-4 h-4" /> Detail 8 Aspek
                              </h4>
                              <div className="space-y-2">
                                {ASPECT_LABELS.map(a => {
                                  const val = kpi.scores[a.key] || 0;
                                  const Icon = a.icon;
                                  return (
                                    <div key={a.key} className="flex items-center gap-2">
                                      <Icon className={`w-3.5 h-3.5 ${a.color} flex-shrink-0`} />
                                      <span className="text-xs w-32 truncate" title={a.label}>{a.label}</span>
                                      <div className="flex-1 bg-muted rounded-full h-2">
                                        <div
                                          className={`h-2 rounded-full transition-all ${val >= 85 ? "bg-emerald-500" : val >= 70 ? "bg-blue-500" : val >= 55 ? "bg-amber-500" : "bg-red-500"}`}
                                          style={{ width: `${val}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-medium w-8 text-right">{val}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-center">
                            <Card className="bg-muted/50">
                              <CardContent className="p-3">
                                <p className="text-lg font-bold">{kpi.details.totalItems}</p>
                                <p className="text-xs text-muted-foreground">Total Item</p>
                              </CardContent>
                            </Card>
                            <Card className="bg-muted/50">
                              <CardContent className="p-3">
                                <p className="text-lg font-bold">{kpi.details.avgProgress}%</p>
                                <p className="text-xs text-muted-foreground">Avg Progress</p>
                              </CardContent>
                            </Card>
                            <Card className={kpi.details.totalOverdue > 0 ? "bg-red-50 dark:bg-red-900/10" : "bg-muted/50"}>
                              <CardContent className="p-3">
                                <p className={`text-lg font-bold ${kpi.details.totalOverdue > 0 ? "text-red-600" : ""}`}>{kpi.details.totalOverdue}</p>
                                <p className="text-xs text-muted-foreground">Overdue</p>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === "history" && (
        <>
          {filteredHistory.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground" data-testid="text-empty-history">Belum ada riwayat penilaian kuartal</p>
                {isAdmin && <p className="text-xs text-muted-foreground mt-1">Klik "Simpan Penilaian Kuartal" untuk membuat snapshot skor saat ini</p>}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map(kpi => {
                const { grade, label, className: gradeCls } = getGrade(kpi.totalScore);
                const isExpanded = expandedId === kpi.id;
                const mappedScores = historyScoresFromKpi(kpi);
                return (
                  <Card key={kpi.id} data-testid={`card-kpi-${kpi.id}`} className="overflow-hidden">
                    <CardContent className="p-0">
                      <button
                        className="w-full p-4 text-left flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-muted/30 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : kpi.id)}
                        data-testid={`button-expand-kpi-${kpi.id}`}
                      >
                        <div className="flex-1 space-y-1.5">
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
                            <Badge className={gradeCls}>{grade} - {label}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Aktivitas: {kpi.activitiesCompleted}/{kpi.activitiesTotal}</span>
                            <span>Kasus: {kpi.casesCompleted}/{kpi.casesTotal}</span>
                            <span>Tugas: {kpi.tasksCompleted}/{kpi.tasksTotal}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <ScoreCircle score={kpi.totalScore} size="sm" />
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t px-4 py-4 space-y-4 bg-muted/10">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="text-sm font-semibold mb-3">Radar Kompetensi</h4>
                              <RadarChart scores={mappedScores} size={200} />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold mb-3">Detail Skor</h4>
                              <div className="space-y-2">
                                {ASPECT_LABELS.map(a => {
                                  const val = (mappedScores as any)[a.key] || 0;
                                  const Icon = a.icon;
                                  return (
                                    <div key={a.key} className="flex items-center gap-2">
                                      <Icon className={`w-3.5 h-3.5 ${a.color} flex-shrink-0`} />
                                      <span className="text-xs w-32 truncate">{a.label}</span>
                                      <div className="flex-1 bg-muted rounded-full h-2">
                                        <div
                                          className={`h-2 rounded-full ${val >= 85 ? "bg-emerald-500" : val >= 70 ? "bg-blue-500" : val >= 55 ? "bg-amber-500" : "bg-red-500"}`}
                                          style={{ width: `${val}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-medium w-8 text-right">{val}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {(kpi.strengths || kpi.improvements || kpi.notes) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {kpi.strengths && (
                                <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30">
                                  <CardContent className="p-3">
                                    <h5 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-1">
                                      <ThumbsUp className="w-3 h-3" /> Kekuatan
                                    </h5>
                                    <p className="text-xs">{kpi.strengths}</p>
                                  </CardContent>
                                </Card>
                              )}
                              {kpi.improvements && (
                                <Card className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30">
                                  <CardContent className="p-3">
                                    <h5 className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-1">
                                      <AlertTriangle className="w-3 h-3" /> Area Perbaikan
                                    </h5>
                                    <p className="text-xs">{kpi.improvements}</p>
                                  </CardContent>
                                </Card>
                              )}
                              {kpi.notes && (
                                <Card className="bg-muted/50 md:col-span-2">
                                  <CardContent className="p-3">
                                    <h5 className="text-xs font-semibold flex items-center gap-1 mb-1">
                                      <Award className="w-3 h-3" /> Catatan Coaching
                                    </h5>
                                    <p className="text-xs">{kpi.notes}</p>
                                  </CardContent>
                                </Card>
                              )}
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground">
                            Dinilai: {new Date(kpi.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Simpan Penilaian Kuartal</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Skor akan diambil otomatis dari performa live saat ini. Tambahkan catatan coaching untuk bahan evaluasi.
          </p>
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

            {selectedUserId && (() => {
              const selectedLive = liveData?.find(l => l.userId === parseInt(selectedUserId));
              if (!selectedLive) return null;
              const { grade, label, className: gradeCls } = getGrade(selectedLive.totalScore);
              return (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold">Skor Live Saat Ini</h4>
                      <div className="flex items-center gap-2">
                        <ScoreCircle score={selectedLive.totalScore} size="sm" />
                        <Badge className={gradeCls}>{grade}</Badge>
                      </div>
                    </div>
                    <RadarChart scores={selectedLive.scores} size={160} />
                  </CardContent>
                </Card>
              );
            })()}

            <div className="space-y-2">
              <Label className="flex items-center gap-1"><ThumbsUp className="w-3 h-3 text-emerald-500" /> Kekuatan</Label>
              <Textarea
                value={strengths}
                onChange={e => setStrengths(e.target.value)}
                placeholder="Apa kelebihan utama DU/DK ini? (misal: teliti, responsif, pengetahuan regulasi baik)"
                rows={2}
                data-testid="input-kpi-strengths"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" /> Area Perbaikan</Label>
              <Textarea
                value={improvements}
                onChange={e => setImprovements(e.target.value)}
                placeholder="Sisi mana yang perlu diperbaiki? (misal: ketepatan waktu, komunikasi, inisiatif)"
                rows={2}
                data-testid="input-kpi-improvements"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Award className="w-3 h-3" /> Catatan Coaching</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Rekomendasi coaching, target perbaikan, catatan reward/punishment..."
                rows={2}
                data-testid="input-kpi-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedUserId || createMutation.isPending}
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
