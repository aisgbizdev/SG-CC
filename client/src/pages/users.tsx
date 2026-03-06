import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth, getRoleLabel } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Shield, Building2, User } from "lucide-react";
import type { Company } from "@shared/schema";

export default function UsersPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: usersData, isLoading } = useQuery<any[]>({ queryKey: ["/api/users"] });
  const { data: companiesData } = useQuery<Company[]>({ queryKey: ["/api/companies"] });

  const [form, setForm] = useState({
    username: "", password: "", fullName: "",
    role: "dk", companyId: "",
    secretQuestion: "Nama ibu kandung", secretAnswer: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Berhasil", description: "User berhasil dibuat" });
      setDialogOpen(false);
      setForm({ username: "", password: "", fullName: "", role: "dk", companyId: "", secretQuestion: "Nama ibu kandung", secretAnswer: "" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal membuat user", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!form.username || !form.password || !form.fullName) {
      toast({ title: "Error", description: "Username, password, dan nama wajib diisi", variant: "destructive" });
      return;
    }
    if (form.password.length < 8) {
      toast({ title: "Error", description: "Password minimal 8 karakter", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      ...form,
      companyId: form.companyId ? parseInt(form.companyId) : null,
      isActive: true,
    });
  };

  const getCompanyName = (id: number | null) => {
    if (!id) return "Semua PT";
    return companiesData?.find(c => c.id === id)?.code || "-";
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Manajemen User</h1>
          <p className="text-sm text-muted-foreground">{usersData?.length || 0} user terdaftar</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user"><Plus className="w-4 h-4 mr-1" /> Tambah User</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Tambah User Baru</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Username *</Label>
                  <Input data-testid="input-user-username" placeholder="Username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>Password *</Label>
                  <Input data-testid="input-user-password" type="password" placeholder="Min 8 karakter" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Nama Lengkap *</Label>
                <Input data-testid="input-user-fullname" placeholder="Nama lengkap" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={v => setForm({...form, role: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="superadmin">Superadmin</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="du">Direktur Utama</SelectItem>
                      <SelectItem value="dk">Direktur Kepatuhan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>PT</Label>
                  <Select value={form.companyId} onValueChange={v => setForm({...form, companyId: v})}>
                    <SelectTrigger><SelectValue placeholder="Pilih PT" /></SelectTrigger>
                    <SelectContent>
                      {companiesData?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.code}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Pertanyaan Rahasia</Label>
                  <Select value={form.secretQuestion} onValueChange={v => setForm({...form, secretQuestion: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nama ibu kandung">Nama ibu kandung</SelectItem>
                      <SelectItem value="Kota lahir">Kota lahir</SelectItem>
                      <SelectItem value="Nama sekolah pertama">Nama sekolah pertama</SelectItem>
                      <SelectItem value="Nama hewan peliharaan">Nama hewan peliharaan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Jawaban Rahasia</Label>
                  <Input data-testid="input-user-secret" placeholder="Jawaban" value={form.secretAnswer} onChange={e => setForm({...form, secretAnswer: e.target.value})} />
                </div>
              </div>
              <Button data-testid="button-submit-user" onClick={handleSubmit} className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Menyimpan..." : "Simpan User"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <div className="space-y-2">
          {usersData?.map((u: any) => {
            const initials = u.fullName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
            return (
              <Card key={u.id} data-testid={`card-user-${u.id}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{u.fullName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span>@{u.username}</span>
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{getCompanyName(u.companyId)}</span>
                    </div>
                  </div>
                  <Badge variant={u.isActive ? "default" : "secondary"}>
                    {getRoleLabel(u.role)}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
