import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck, Clock, AlertTriangle, ListTodo, Megaphone, Mail, FileWarning } from "lucide-react";
import { DataPagination, usePagination } from "@/components/data-pagination";
import { usePageTitle } from "@/hooks/use-page-title";
import { QueryError } from "@/components/query-error";
import type { Notification } from "@shared/schema";

const iconMap: Record<string, any> = {
  task_assigned: ListTodo,
  announcement: Megaphone,
  new_message: Mail,
  overdue: AlertTriangle,
  comment: FileWarning,
};

const priorityColors: Record<string, string> = {
  high: "bg-red-100 dark:bg-red-900/20",
  critical: "bg-red-100 dark:bg-red-900/20",
  medium: "bg-amber-50 dark:bg-amber-900/10",
  low: "",
};

export default function NotifikasiPage() {
  usePageTitle("Notifikasi");
  const [currentPage, setCurrentPage] = useState(1);
  const { data: notifications, isLoading, isError, refetch } = useQuery<Notification[]>({ queryKey: ["/api/notifications"] });

  const readMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const readAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

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
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={() => readAllMutation.mutate()} data-testid="button-read-all">
            <CheckCheck className="w-4 h-4 mr-1" /> Tandai Semua Dibaca
          </Button>
        )}
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
                className={`hover-elevate cursor-pointer ${!n.isRead ? priorityColors[n.priority] || "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
                data-testid={`card-notification-${n.id}`}
                onClick={() => { if (!n.isRead) readMutation.mutate(n.id); }}
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
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
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
