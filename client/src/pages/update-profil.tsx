import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserCircle, Save } from "lucide-react";

export default function UpdateProfilPage() {
  const { user } = useAuth();
  const { toast } = useToast();

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
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal menyimpan profil", variant: "destructive" });
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

  if (isLoading || !actualData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-3">
            <UserCircle className="w-9 h-9 text-primary" />
          </div>
          <CardTitle className="text-xl" data-testid="text-profile-title">Lengkapi Profil Anda</CardTitle>
          <CardDescription>Silakan lengkapi data pribadi Anda sebelum melanjutkan</CardDescription>
        </CardHeader>
        <CardContent>
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

            <div className="grid grid-cols-2 gap-3">
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
              Simpan & Lanjutkan
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
