import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth, getRoleLabel } from "@/lib/auth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Activity, FileWarning, ListTodo, Megaphone, Mail, Bell,
  Settings, Users, Building2, Shield, LogOut, ChevronDown, BarChart3, Bot, ExternalLink, BellRing, X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useToast } from "@/hooks/use-toast";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const push = usePushNotifications();
  const [pushDismissed, setPushDismissed] = useState(() => localStorage.getItem("sgcc_push_dismissed") === "1");

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000,
  });

  const showPushBanner = push.isSupported && !push.isSubscribed && push.permission !== "denied" && !pushDismissed;

  const handleEnablePush = async () => {
    const ok = await push.subscribe();
    if (ok) {
      toast({ title: "Notifikasi Push Aktif", description: "Anda akan menerima notifikasi di browser ini" });
    } else if (push.permission === "denied") {
      toast({ title: "Izin Ditolak", description: "Aktifkan notifikasi di pengaturan browser Anda", variant: "destructive" });
    }
  };

  const handleDismissPush = () => {
    setPushDismissed(true);
    localStorage.setItem("sgcc_push_dismissed", "1");
  };

  if (!user) return null;

  const mainMenuItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Aktivitas", url: "/aktivitas", icon: Activity },
    { title: "Kasus Pengaduan", url: "/kasus", icon: FileWarning },
    { title: "Tugas", url: "/tugas", icon: ListTodo },
    { title: "Pengumuman", url: "/pengumuman", icon: Megaphone },
    { title: "Pesan", url: "/pesan", icon: Mail },
    { title: "Notifikasi", url: "/notifikasi", icon: Bell, badge: unreadCount?.count },
    { title: "Penilaian KPI", url: "/kpi", icon: BarChart3 },
  ];

  const adminMenuItems = user.role === "superadmin" ? [
    { title: "Manajemen User", url: "/users", icon: Users },
    { title: "Manajemen PT", url: "/companies", icon: Building2 },
    { title: "Pengaturan", url: "/pengaturan", icon: Settings },
  ] : [
    { title: "Pengaturan", url: "/pengaturan", icon: Settings },
  ];

  const initials = user.fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" data-testid="link-home-logo">
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
            <img src="/icon-192.png" alt="SGCC" className="w-9 h-9 rounded-md flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="font-bold text-sm truncate">SG Control Center</h2>
              <p className="text-xs text-muted-foreground truncate">Pusat Kendali Grup</p>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {showPushBanner && (
          <div className="mx-3 mt-2 p-2.5 bg-primary/10 border border-primary/20 rounded-lg" data-testid="push-notification-banner">
            <div className="flex items-start gap-2">
              <BellRing className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">Aktifkan Notifikasi</p>
                <p className="text-xs text-muted-foreground mt-0.5">Dapatkan notifikasi real-time di browser Anda</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={handleEnablePush} className="text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-md hover:bg-primary/90 transition-colors" data-testid="button-enable-push">
                    Aktifkan
                  </button>
                  <button onClick={handleDismissPush} className="text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="button-dismiss-push">
                    Nanti
                  </button>
                </div>
              </div>
              <button onClick={handleDismissPush} className="text-muted-foreground hover:text-foreground" data-testid="button-close-push-banner">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-active={location === item.url || (item.url !== "/" && location.startsWith(item.url))}>
                    <Link href={item.url} data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}>
                      <item.icon className="w-4 h-4" />
                      <span className="flex-1">{item.title}</span>
                      {item.badge && item.badge > 0 ? (
                        <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Alat Bantu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a
                    href="https://chatgpt.com/g/g-693fa1b8cc388191b1ceffe68d41b514-sg-compliance-risk-assistant"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="nav-ai-compliance"
                    className="flex items-center gap-2"
                  >
                    <Bot className="w-4 h-4" />
                    <span className="flex-1">AI Compliance</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{user.role === "superadmin" ? "Administrasi" : "Lainnya"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-active={location === item.url}>
                    <Link href={item.url} data-testid={`nav-${item.url.replace("/", "")}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full p-2 rounded-md text-left" data-testid="button-user-menu">
              <Avatar className="w-8 h-8">
                {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.fullName} /> : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{user.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{getRoleLabel(user.role)}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/pengaturan" data-testid="menu-settings">
                <Settings className="w-4 h-4 mr-2" /> Pengaturan
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout} data-testid="menu-logout">
              <LogOut className="w-4 h-4 mr-2" /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
