import { useState } from "react";
import { useAuth, getRoleLabel } from "@/lib/auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Lock, User, Shield, Building2, Pencil, Book, BellRing } from "lucide-react";
import { Link } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export default function PengaturanPage() {
  usePageTitle("Pengaturan");
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePwMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/auth/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Berhasil", description: "Password berhasil diubah" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message?.includes(":") ? err.message.split(": ").slice(1).join(": ") : "Gagal mengubah password", variant: "destructive" });
    },
  });

  const handleChangePassword = () => {
    if (newPassword.length < 8) {
      toast({ title: "Error", description: "Password baru minimal 8 karakter", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Konfirmasi password tidak cocok", variant: "destructive" });
      return;
    }
    changePwMutation.mutate({ currentPassword, newPassword });
  };

  const push = usePushNotifications();

  const handleTogglePush = async () => {
    if (push.isSubscribed) {
      const ok = await push.unsubscribe();
      if (ok) toast({ title: "Notifikasi Push Dinonaktifkan", description: "Anda tidak akan menerima notifikasi push lagi" });
    } else {
      const ok = await push.subscribe();
      if (ok) {
        toast({ title: "Notifikasi Push Aktif", description: "Anda akan menerima notifikasi di browser ini" });
        localStorage.removeItem("sgcc_push_dismissed");
      } else if (push.permission === "denied") {
        toast({ title: "Izin Ditolak", description: "Aktifkan notifikasi di pengaturan browser Anda", variant: "destructive" });
      }
    }
  };

  const initials = user?.fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() || "";

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">Kelola akun dan preferensi Anda</p>
      </div>

      <Card>
        <CardHeader className="pb-3 px-5 pt-5">
          <h3 className="font-semibold flex items-center gap-2"><User className="w-4 h-4" /> Profil</h3>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.fullName} /> : null}
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-lg font-semibold" data-testid="text-user-fullname">{user?.fullName}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Shield className="w-3 h-3" /> {getRoleLabel(user?.role || "")}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {user?.companyId ? `PT ID: ${user.companyId}` : "Semua PT"}
              </p>
            </div>
            <Link href="/update-profil">
              <Button variant="outline" size="sm" data-testid="button-edit-profile">
                <Pencil className="w-4 h-4 mr-1" /> Edit Profil
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 px-5 pt-5">
          <h3 className="font-semibold flex items-center gap-2"><Lock className="w-4 h-4" /> Ganti Password</h3>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Password Lama</Label>
            <Input data-testid="input-current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Password Baru</Label>
            <Input data-testid="input-new-password" type="password" placeholder="Minimal 8 karakter" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Konfirmasi Password Baru</Label>
            <Input data-testid="input-confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
          <Button data-testid="button-change-password" onClick={handleChangePassword} disabled={changePwMutation.isPending}>
            {changePwMutation.isPending ? "Memproses..." : "Ganti Password"}
          </Button>
        </CardContent>
      </Card>

      {push.isSupported && (
        <Card>
          <CardHeader className="pb-3 px-5 pt-5">
            <h3 className="font-semibold flex items-center gap-2"><BellRing className="w-4 h-4" /> Notifikasi Push</h3>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm">
                  {push.isSubscribed ? "Notifikasi push aktif di browser ini" : "Aktifkan notifikasi push untuk mendapatkan pemberitahuan real-time"}
                </p>
                {push.permission === "denied" && (
                  <p className="text-xs text-destructive mt-1">Izin notifikasi ditolak. Ubah di pengaturan browser Anda.</p>
                )}
              </div>
              <Button
                data-testid="button-toggle-push"
                variant={push.isSubscribed ? "outline" : "default"}
                size="sm"
                onClick={handleTogglePush}
                disabled={push.permission === "denied"}
              >
                {push.isSubscribed ? "Nonaktifkan" : "Aktifkan"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3 px-5 pt-5">
          <h3 className="font-semibold flex items-center gap-2"><Book className="w-4 h-4" /> Panduan Kode Kasus</h3>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">
                Format kode kasus adalah: <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">[PT]-[JENIS]-[NOMOR]</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">Contoh: EWF-BAP-002</p>
            </div>
            <div className="border-t pt-3 space-y-2.5">
              <div>
                <p className="font-semibold text-sm" data-testid="text-code-BAP">BAP</p>
                <p className="text-sm text-muted-foreground">Bappebti — pengaduan jalur Bappebti</p>
              </div>
              <div>
                <p className="font-semibold text-sm" data-testid="text-code-PID">PID</p>
                <p className="text-sm text-muted-foreground">Pidana — kasus tindak pidana</p>
              </div>
              <div>
                <p className="font-semibold text-sm" data-testid="text-code-PMR">PMR</p>
                <p className="text-sm text-muted-foreground">Pemeriksaan — tahap pemeriksaan internal</p>
              </div>
              <div>
                <p className="font-semibold text-sm" data-testid="text-code-PNB">PNB</p>
                <p className="text-sm text-muted-foreground">Pengaduan Nasabah Baru</p>
              </div>
              <div>
                <p className="font-semibold text-sm" data-testid="text-code-POL">POL</p>
                <p className="text-sm text-muted-foreground">Polisi — kasus dilaporkan ke kepolisian</p>
              </div>
              <div>
                <p className="font-semibold text-sm" data-testid="text-code-SBL">SBL</p>
                <p className="text-sm text-muted-foreground">Sengketa BBJ/Lainnya</p>
              </div>
              <div>
                <p className="font-semibold text-sm" data-testid="text-code-STL">STL</p>
                <p className="text-sm text-muted-foreground">Settlement — jalur penyelesaian</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
