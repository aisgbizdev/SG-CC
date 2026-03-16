import { useQuery } from "@tanstack/react-query";
import { useAuth, getRoleLabel } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Activity, FileWarning, ListTodo, Megaphone, AlertTriangle,
  TrendingUp, Clock, Plus, ArrowRight, ShieldAlert, CheckCircle2, Bot, ExternalLink,
} from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { QueryError } from "@/components/query-error";
import { StatusBadge, RiskBadge } from "@/components/status-badges";
import type { Activity as ActivityType, Case } from "@shared/schema";

function StatCard({ title, value, icon: Icon, color, subtitle, href }: {
  title: string; value: number | string; icon: any; color: string; subtitle?: string; href?: string;
}) {
  const content = (
    <Card className={href ? "cursor-pointer hover-elevate" : ""} data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-1">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

export default function DashboardPage() {
  usePageTitle("Dashboard");
  const { user } = useAuth();
  const { data: stats, isLoading, isError, refetch } = useQuery<any>({ queryKey: ["/api/dashboard"] });
  const { data: companiesData } = useQuery<any[]>({ queryKey: ["/api/companies"] });

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={`c${i}`} className="h-28" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-3 sm:p-6 max-w-7xl mx-auto">
        <QueryError message="Gagal memuat data dashboard. Silakan coba lagi." onRetry={() => refetch()} />
      </div>
    );
  }

  const canAddActivity = ["du", "dk"].includes(user?.role || "");
  const canAddCase = ["du", "dk"].includes(user?.role || "");

  const getCompanyName = (id: number) => companiesData?.find((c: any) => c.id === id)?.code || "-";

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Selamat datang, {user?.fullName} ({getRoleLabel(user?.role || "")})
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canAddActivity && (
            <Link href="/aktivitas?action=new">
              <Button size="sm" data-testid="button-quick-add-activity">
                <Plus className="w-4 h-4 mr-1" /> Aktivitas Baru
              </Button>
            </Link>
          )}
          {canAddCase && (
            <Link href="/kasus?action=new">
              <Button size="sm" variant="secondary" data-testid="button-quick-add-case">
                <Plus className="w-4 h-4 mr-1" /> Kasus Baru
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Aktivitas" value={stats?.totalActivities || 0} icon={Activity} color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" href="/aktivitas" />
        <StatCard title="Aktivitas Selesai" value={stats?.completedActivities || 0} icon={CheckCircle2} color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" subtitle={`dari ${stats?.totalActivities || 0} total`} href="/aktivitas" />
        <StatCard title="Kasus Aktif" value={stats?.activeCases || 0} icon={FileWarning} color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" subtitle={`${stats?.overdueCases || 0} overdue`} href="/kasus" />
        <StatCard title="Menunggu Keputusan" value={stats?.waitingCases || 0} icon={Clock} color="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" subtitle={`${stats?.longWaitingCases || 0} menunggu >30 hari`} href="/kasus?stage=waiting" />
        <StatCard title="Kasus Selesai" value={stats?.closedCases || 0} icon={CheckCircle2} color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" subtitle={`dari ${stats?.totalCases || 0} total`} href="/kasus" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Tugas Aktif" value={stats?.pendingTasks || 0} icon={ListTodo} color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" href="/tugas" />
        <StatCard title="Tugas Selesai" value={stats?.completedTasks || 0} icon={CheckCircle2} color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" subtitle={`dari ${stats?.totalTasks || 0} total`} href="/tugas" />
        <StatCard title="Pengumuman" value={stats?.totalAnnouncements || 0} icon={Megaphone} color="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" href="/pengumuman" />
      </div>

      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent" data-testid="card-ai-compliance">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">SG Compliance & Risk Assistant</p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              Asisten AI untuk memahami KYC, APU PPT, pencegahan risiko, dan panduan komunikasi aman dengan nasabah.
            </p>
          </div>
          <a
            href="https://chatgpt.com/g/g-693fa1b8cc388191b1ceffe68d41b514-sg-compliance-risk-assistant"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" variant="outline" className="flex-shrink-0" data-testid="button-open-ai-compliance">
              <Bot className="w-4 h-4 mr-1" /> Buka AI
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </a>
        </CardContent>
      </Card>

      {(stats?.overdueCases > 0) && (
        <Card className="border-red-200 dark:border-red-900/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-md flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Perhatian: {stats.overdueCases} kasus melewati target penyelesaian</p>
              <p className="text-xs text-muted-foreground">Segera tindak lanjuti kasus yang overdue</p>
            </div>
            <Link href="/kasus">
              <Button variant="secondary" size="sm" data-testid="button-view-overdue">Lihat</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-3 px-4 pt-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Aktivitas Terbaru</h3>
            </div>
            <Link href="/aktivitas">
              <Button variant="ghost" size="sm" data-testid="link-all-activities">
                Semua <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {stats?.recentActivities?.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivities.map((a: ActivityType) => (
                  <Link key={a.id} href={`/aktivitas/${a.id}`}>
                    <div className="p-3 rounded-md bg-muted/50 hover-elevate cursor-pointer space-y-1.5" data-testid={`card-activity-${a.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium line-clamp-1">{a.title}</p>
                        <StatusBadge status={a.status} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{getCompanyName(a.companyId)}</span>
                        <span>{a.date}</span>
                      </div>
                      <Progress value={a.progress} className="h-1.5" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada aktivitas</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-3 px-4 pt-4">
            <div className="flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Kasus Terbaru</h3>
            </div>
            <Link href="/kasus">
              <Button variant="ghost" size="sm" data-testid="link-all-cases">
                Semua <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {stats?.recentCases?.length > 0 ? (
              <div className="space-y-3">
                {stats.recentCases.map((c: Case) => (
                  <Link key={c.id} href={`/kasus/${c.id}`}>
                    <div className="p-3 rounded-md bg-muted/50 hover-elevate cursor-pointer space-y-1.5" data-testid={`card-case-${c.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-primary" data-testid={`text-account-recent-${c.id}`}>No. Akun: {c.accountNumber || "-"}</span>
                            <span className="text-xs text-muted-foreground">{c.caseCode}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{c.customerName}</p>
                        </div>
                        <RiskBadge level={c.riskLevel} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{getCompanyName(c.companyId)}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <Progress value={c.progress} className="h-1.5" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada kasus</p>
            )}
          </CardContent>
        </Card>
      </div>

      {stats?.highRiskCases?.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-3 px-4 pt-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <h3 className="font-semibold text-sm">Kasus Risiko Tinggi</h3>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {stats.highRiskCases.map((c: Case) => (
                <Link key={c.id} href={`/kasus/${c.id}`}>
                  <div className="flex items-center justify-between gap-3 p-3 rounded-md bg-red-50/50 dark:bg-red-900/10 hover-elevate cursor-pointer" data-testid={`card-high-risk-${c.id}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary" data-testid={`text-account-highrisk-${c.id}`}>No. Akun: {c.accountNumber || "-"}</span>
                        <span className="text-xs text-muted-foreground">{c.caseCode}</span>
                        <span className="text-sm">- {c.customerName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{c.summary}</p>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      <RiskBadge level={c.riskLevel} />
                      <p className="text-xs text-muted-foreground">{c.progress}%</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
