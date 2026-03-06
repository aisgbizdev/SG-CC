import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

import LoginPage from "@/pages/login";
import UpdateProfilPage from "@/pages/update-profil";
import DashboardPage from "@/pages/dashboard";
import AktivitasPage from "@/pages/aktivitas";
import AktivitasDetailPage from "@/pages/aktivitas-detail";
import KasusPage from "@/pages/kasus";
import KasusDetailPage from "@/pages/kasus-detail";
import TugasPage from "@/pages/tugas";
import PengumumanPage from "@/pages/pengumuman";
import PesanPage from "@/pages/pesan";
import NotifikasiPage from "@/pages/notifikasi";
import PengaturanPage from "@/pages/pengaturan";
import UsersPage from "@/pages/users";
import CompaniesPage from "@/pages/companies";
import NotFound from "@/pages/not-found";

function HeaderBar() {
  const { user, logout } = useAuth();
  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000,
    enabled: !!user,
  });

  return (
    <header className="flex items-center justify-between gap-1 p-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <SidebarTrigger data-testid="button-sidebar-toggle" />
      <div className="flex items-center gap-1">
        <Link href="/notifikasi">
          <Button variant="ghost" size="icon" className="relative" data-testid="button-header-notifications">
            <Bell className="w-4 h-4" />
            {unreadCount && unreadCount.count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount.count > 9 ? "9+" : unreadCount.count}
              </span>
            )}
          </Button>
        </Link>
        <Button variant="ghost" size="icon" onClick={logout} data-testid="button-header-logout" title="Keluar">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}

function AuthenticatedApp() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (location !== "/login") return <Redirect to="/login" />;
    return <LoginPage />;
  }

  if (location === "/login") return <Redirect to="/" />;

  if (!user.profileCompleted && ["du", "dk"].includes(user.role)) {
    if (location !== "/update-profil") return <Redirect to="/update-profil" />;
    return <UpdateProfilPage />;
  }

  if (location === "/update-profil") return <Redirect to="/" />;

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <HeaderBar />
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/" component={DashboardPage} />
              <Route path="/aktivitas" component={AktivitasPage} />
              <Route path="/aktivitas/:id" component={AktivitasDetailPage} />
              <Route path="/kasus" component={KasusPage} />
              <Route path="/kasus/:id" component={KasusDetailPage} />
              <Route path="/tugas" component={TugasPage} />
              <Route path="/pengumuman" component={PengumumanPage} />
              <Route path="/pesan" component={PesanPage} />
              <Route path="/notifikasi" component={NotifikasiPage} />
              <Route path="/pengaturan" component={PengaturanPage} />
              <Route path="/users" component={UsersPage} />
              <Route path="/companies" component={CompaniesPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Switch>
            <Route path="/login" component={LoginPage} />
            <Route component={AuthenticatedApp} />
          </Switch>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
