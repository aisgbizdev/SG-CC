import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, Save, ArrowLeft, Camera, Upload, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";

export default function UpdateProfilPage() {
  usePageTitle("Update Profil");
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  const [formData, setFormData] = useState<any>(null);

  const actualData = formData || profile;

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", "/api/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Berhasil", description: "Profil berhasil diperbarui" });
      window.location.href = "/pengaturan";
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal menyimpan profil", variant: "destructive" });
    },
  });

  const avatarMutation = useMutation({
    mutationFn: async (avatarUrl: string) => {
      const res = await apiRequest("POST", "/api/auth/avatar", { avatarUrl });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Berhasil", description: "Foto profil berhasil diperbarui" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal mengupload foto", variant: "destructive" });
    },
  });

  const deleteAvatarMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/auth/avatar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Berhasil", description: "Foto profil berhasil dihapus" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal menghapus foto", variant: "destructive" });
    },
  });

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...(prev || profile), [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualData) return;
    mutation.mutate({
      fullName: actualData.fullName,
      phone: actualData.phone || "",
      address: actualData.address || "",
      birthDate: actualData.birthDate || "",
      branchCount: actualData.branchCount ? parseInt(actualData.branchCount) : null,
      position: actualData.position || "",
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "File harus berupa gambar", variant: "destructive" });
      return;
    }
    if (file.size > 500000) {
      toast({ title: "Error", description: "Ukuran foto maksimal 500KB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      avatarMutation.mutate(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (isLoading || !actualData) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = actualData.fullName?.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() || "";

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/pengaturan"><Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-profile-title">Update Profil</h1>
          <p className="text-sm text-muted-foreground">Perbarui data pribadi Anda</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-lg">Foto Profil</CardTitle>
          <CardDescription>Upload foto dari file atau ambil dari kamera</CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex items-center gap-5">
            <Avatar className="w-20 h-20">
              {actualData.avatarUrl ? (
                <AvatarImage src={actualData.avatarUrl} alt={actualData.fullName} />
              ) : null}
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  data-testid="input-avatar-file"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarMutation.isPending}
                  data-testid="button-upload-photo"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  {avatarMutation.isPending ? "Mengupload..." : "Pilih File"}
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  id="camera-input"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("camera-input")?.click()}
                  disabled={avatarMutation.isPending}
                  data-testid="button-camera-photo"
                >
                  <Camera className="w-4 h-4 mr-1" /> Kamera
                </Button>
              </div>
              {actualData.avatarUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive w-fit"
                  onClick={() => deleteAvatarMutation.mutate()}
                  disabled={deleteAvatarMutation.isPending}
                  data-testid="button-delete-photo"
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Hapus Foto
                </Button>
              )}
              <p className="text-xs text-muted-foreground">Format: JPG, PNG. Maks 500KB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 px-5 pt-5">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Data Profil</CardTitle>
              <CardDescription>Lengkapi data profil Anda</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input
                id="fullName"
                data-testid="input-profile-fullname"
                value={actualData.fullName || ""}
                onChange={(e) => handleChange("fullName", e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="position">Jabatan</Label>
              <Input
                id="position"
                data-testid="input-profile-position"
                placeholder="Contoh: Direktur Utama"
                value={actualData.position || ""}
                onChange={(e) => handleChange("position", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone">No. Telepon</Label>
                <Input
                  id="phone"
                  data-testid="input-profile-phone"
                  placeholder="08xxxxxxxxxx"
                  value={actualData.phone || ""}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="birthDate">Tanggal Lahir</Label>
                <Input
                  id="birthDate"
                  data-testid="input-profile-birthdate"
                  type="date"
                  value={actualData.birthDate || ""}
                  onChange={(e) => handleChange("birthDate", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Alamat</Label>
              <Textarea
                id="address"
                data-testid="input-profile-address"
                placeholder="Alamat lengkap"
                rows={2}
                value={actualData.address || ""}
                onChange={(e) => handleChange("address", e.target.value)}
              />
            </div>

            {user && ["du", "dk"].includes(user.role) && (
              <div className="space-y-1.5">
                <Label htmlFor="branchCount">Jumlah Cabang yang Dikelola</Label>
                <Input
                  id="branchCount"
                  data-testid="input-profile-branchcount"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={actualData.branchCount || ""}
                  onChange={(e) => handleChange("branchCount", e.target.value)}
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
              data-testid="button-save-profile"
            >
              {mutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Simpan Profil
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
