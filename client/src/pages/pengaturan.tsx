import { useState } from "react";
import { useAuth, getRoleLabel } from "@/lib/auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Lock, User, Shield, Building2, Pencil } from "lucide-react";
import { Link } from "wouter";

export default function PengaturanPage() {
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
    </div>
  );
}
