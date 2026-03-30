import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Bell, CheckCheck, Clock, AlertTriangle, ListTodo, Megaphone, Mail, FileWarning, RefreshCw, MessageCircle, Calendar, CheckCircle, ShieldAlert, MailWarning, BarChart3, Activity, Trash2 } from "lucide-react";
import { DataPagination, usePagination } from "@/components/data-pagination";
import { usePageTitle } from "@/hooks/use-page-title";
import { QueryError } from "@/components/query-error";
import type { Notification } from "@shared/schema";

const iconMap: Record<string, any> = {
  task_assigned: ListTodo,
  task_updated: ListTodo,
  task_completed: CheckCircle,
  task_overdue: AlertTriangle,
  task_stale: Clock,
  new_activity: Activity,
  activity_updated: RefreshCw,
  new_case: FileWarning,
  case_updated: RefreshCw,
  case_completed: CheckCircle,
  case_high_risk: ShieldAlert,
  case_stale: Clock,
  new_comment: MessageCircle,
  new_announcement: Megaphone,
  announcement: Megaphone,
  new_message: Mail,
  message_unread: MailWarning,
  new_meeting: Calendar,
  daily_summary: BarChart3,
  overdue: AlertTriangle,
  comment: FileWarning,
  no_activity: AlertTriangle,
  no_activity_report: BarChart3,
};

const priorityColors: Record<string, string> = {
  high: "bg-red-100 dark:bg-red-900/20",
  critical: "bg-red-100 dark:bg-red-900/20",
  medium: "bg-amber-50 dark:bg-amber-900/10",
  low: "",
};

function getNotificationUrl(n: Notification): string | null {
  const entityType = n.entityType;
  const entityId = n.entityId;
  if (!entityType) return null;
  const detailRoutes: Record<string, string> = { activity: "/aktivitas", case: "/kasus" };
  const listRoutes: Record<string, string> = { task: "/tugas", announcement: "/pengumuman", message: "/pesan" };
  if (detailRoutes[entityType] && entityId) return `${detailRoutes[entityType]}/${entityId}`;
  if (listRoutes[entityType]) return listRoutes[entityType];
  return null;
}

export default function NotifikasiPage() {
  usePageTitle("Notifikasi");
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState<{ type: "read" | "all" } | null>(null);
  const { data: notifications, isLoading, isError, refetch } = useQuery<Notification[]>({ queryKey: ["/api/notifications"] });

  const invalidateNotifications = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
  };

  const readMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: invalidateNotifications,
  });

  const readAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/read-all");
    },
    onSuccess: invalidateNotifications,
  });

  const deleteOneMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/notifications/${id}`);
    },
    onSuccess: () => {
      invalidateNotifications();
      toast({ title: "Berhasil", description: "Notifikasi dihapus" });
    },
  });

  const deleteReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/notifications/read");
    },
    onSuccess: () => {
      invalidateNotifications();
      setConfirmDialog(null);
      setCurrentPage(1);
      toast({ title: "Berhasil", description: "Notifikasi yang sudah dibaca berhasil dihapus" });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/notifications/all");
    },
    onSuccess: () => {
      invalidateNotifications();
      setConfirmDialog(null);
      setCurrentPage(1);
      toast({ title: "Berhasil", description: "Semua notifikasi berhasil dihapus" });
    },
  });

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;
  const readCount = notifications?.filter(n => n.isRead).length || 0;

  const allNotifications = notifications || [];
  const { totalPages, totalItems, getPageItems } = usePagination(allNotifications, 20);
  const pagedItems = getPageItems(currentPage);

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Notifikasi</h1>
          <p className="text-sm text-muted-foreground">{unreadCount} belum dibaca</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={() => readAllMutation.mutate()} data-testid="button-read-all">
              <CheckCheck className="w-4 h-4 mr-1" /> Tandai Semua Dibaca
            </Button>
          )}
          {readCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => setConfirmDialog({ type: "read" })} data-testid="button-delete-read" className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-900/20">
              <Trash2 className="w-4 h-4 mr-1" /> Hapus Sudah Dibaca ({readCount})
            </Button>
          )}
          {allNotifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setConfirmDialog({ type: "all" })} data-testid="button-delete-all" className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20">
              <Trash2 className="w-4 h-4 mr-1" /> Hapus Semua
            </Button>
          )}
        </div>
      </div>

      {isError ? (
        <QueryError message="Gagal memuat data notifikasi. Silakan coba lagi." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : notifications?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground/30" />
            <p className="text-muted-foreground">Belum ada notifikasi</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {pagedItems.map(n => {
            const Icon = iconMap[n.type] || Bell;
            return (
              <Card
                key={n.id}
                className={`group hover-elevate cursor-pointer ${!n.isRead ? priorityColors[n.priority] || "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
                data-testid={`card-notification-${n.id}`}
                onClick={() => {
                  if (!n.isRead) readMutation.mutate(n.id);
                  const url = getNotificationUrl(n);
                  if (url) navigate(url);
                }}
              >
                <CardContent className="p-3 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${!n.isRead ? "bg-primary/10" : "bg-muted"}`}>
                    <Icon className={`w-4 h-4 ${!n.isRead ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className={`text-sm ${!n.isRead ? "font-medium" : ""}`}>{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{n.message}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(n.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-2" />}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteOneMutation.mutate(n.id);
                      }}
                      data-testid={`button-delete-notification-${n.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <DataPagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={setCurrentPage} />
        </div>
      )}

      <Dialog open={confirmDialog !== null} onOpenChange={(open) => { if (!open) setConfirmDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmDialog?.type === "read"
              ? `Hapus ${readCount} notifikasi yang sudah dibaca? Tindakan ini tidak bisa dibatalkan.`
              : `Hapus semua ${allNotifications.length} notifikasi? Tindakan ini tidak bisa dibatalkan.`
            }
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog(null)} data-testid="button-cancel-delete">
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDialog?.type === "read") deleteReadMutation.mutate();
                else deleteAllMutation.mutate();
              }}
              disabled={deleteReadMutation.isPending || deleteAllMutation.isPending}
              data-testid="button-confirm-delete"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {(deleteReadMutation.isPending || deleteAllMutation.isPending) ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
