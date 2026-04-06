import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, Activity, FileWarning, ListTodo, MoreHorizontal,
  Megaphone, Mail, Bell, Settings, Users, Building2, BarChart3, Bot, ExternalLink,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";

export function MobileBottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000,
    enabled: !!user,
  });

  if (!user) return null;

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location === url || location.startsWith(url + "/");
  };

  const totalBadge = unreadCount?.count || 0;

  const moreMenuItems = [
    { title: "Penilaian KPI", url: "/kpi", icon: BarChart3 },
    { title: "Pengumuman", url: "/pengumuman", icon: Megaphone },
    { title: "Pesan", url: "/pesan", icon: Mail },
    { title: "Notifikasi", url: "/notifikasi", icon: Bell, badge: totalBadge },
    { title: "Pengaturan", url: "/pengaturan", icon: Settings },
    ...(user.role === "superadmin" ? [
      { title: "Manajemen User", url: "/users", icon: Users },
      { title: "Manajemen PT", url: "/companies", icon: Building2 },
    ] : []),
  ];

  const isMoreActive = moreMenuItems.some(item => isActive(item.url));

  const primaryTabs = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Aktivitas", url: "/aktivitas", icon: Activity },
    { title: "Kasus", url: "/kasus", icon: FileWarning },
    { title: "Tugas", url: "/tugas", icon: ListTodo },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} data-testid="mobile-bottom-nav" aria-label="Menu navigasi utama">
      <div className="flex items-center justify-around h-16 px-1">
        {primaryTabs.map((tab) => {
          const active = isActive(tab.url);
          return (
            <Link
              key={tab.url}
              href={tab.url}
              className={`flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-lg transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              data-testid={`bottom-nav-${tab.url.replace("/", "") || "dashboard"}`}
              aria-current={active ? "page" : undefined}
            >
              <tab.icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className={`text-[10px] leading-tight ${active ? "font-semibold" : "font-medium"}`}>{tab.title}</span>
            </Link>
          );
        })}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className={`flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-lg transition-colors relative ${isMoreActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              data-testid="bottom-nav-more"
              aria-label="Menu lainnya"
              aria-expanded={open}
            >
              <MoreHorizontal className={`w-5 h-5 ${isMoreActive ? "stroke-[2.5]" : ""}`} />
              <span className={`text-[10px] leading-tight ${isMoreActive ? "font-semibold" : "font-medium"}`}>Lainnya</span>
              {totalBadge > 0 && (
                <span className="absolute top-1 right-2 bg-destructive text-destructive-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center" aria-label={`${totalBadge} notifikasi belum dibaca`}>
                  {totalBadge > 9 ? "9+" : totalBadge}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))" }}>
            <SheetHeader>
              <SheetTitle>Menu Lainnya</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 py-4" role="menu">
              {moreMenuItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <Link
                    key={item.url}
                    href={item.url}
                    onClick={() => setOpen(false)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors relative ${active ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"}`}
                    data-testid={`bottom-nav-more-${item.url.replace("/", "")}`}
                    aria-current={active ? "page" : undefined}
                    role="menuitem"
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="text-xs font-medium text-center leading-tight">{item.title}</span>
                    {"badge" in item && item.badge && item.badge > 0 ? (
                      <span className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
              <a
                href="https://chatgpt.com/g/g-693fa1b8cc388191b1ceffe68d41b514-sg-compliance-risk-assistant"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted text-foreground relative"
                data-testid="bottom-nav-more-ai-compliance"
                role="menuitem"
              >
                <Bot className="w-6 h-6" />
                <span className="text-xs font-medium text-center leading-tight">AI Compliance</span>
                <ExternalLink className="w-3 h-3 absolute top-1.5 right-1.5 text-muted-foreground" />
              </a>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
