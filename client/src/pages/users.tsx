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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Shield, Building2, User, KeyRound, Trash2, RotateCcw, Pencil } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import type { Company } from "@shared/schema";

export default function UsersPage() {
  usePageTitle("Manajemen User");
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const isSuperadmin = currentUser?.role === "superadmin";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetUserName, setResetUserName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [toggleActiveDialog, setToggleActiveDialog] = useState<{ open: boolean; userId: number | null; userName: string; currentlyActive: boolean }>({ open: false, userId: null, userName: "", currentlyActive: true });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const { data: usersData, isLoading } = useQuery<any[]>({ queryKey: ["/api/users"] });
  const { data: companiesData } = useQuery<Company[]>({ queryKey: ["/api/companies"] });

  const [form, setForm] = useState({
    username: "", password: "", fullName: "",
    role: "dk", companyId: "",
    secretQuestion: "Nama ibu kandung", secretAnswer: "",
    position: "", phone: "", address: "",
  });

  const [editForm, setEditForm] = useState({
    fullName: "", position: "", role: "", companyId: "",
    phone: "", address: "", birthDate: "",
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
      setForm({ username: "", password: "", fullName: "", role: "dk", companyId: "", secretQuestion: "Nama ibu kandung", secretAnswer: "", position: "", phone: "", address: "" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal membuat user", variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: number; newPassword: string }) => {
      const res = await apiRequest("POST", `/api/users/${userId}/reset-password`, { newPassword });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Berhasil", description: "Password berhasil direset" });
      setResetDialogOpen(false);
      setNewPassword("");
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal reset password", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}`, { isActive });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Berhasil", description: variables.isActive ? "User berhasil diaktifkan kembali" : "User berhasil dinonaktifkan" });
      setToggleActiveDialog({ open: false, userId: null, userName: "", currentlyActive: true });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal mengubah status user", variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Berhasil", description: "Data user berhasil diperbarui" });
      setEditDialogOpen(false);
      setEditingUser(null);
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal memperbarui user", variant: "destructive" });
    },
  });

  const openEditDialog = (u: any) => {
    setEditingUser(u);
    setEditForm({
      fullName: u.fullName || "",
      position: u.position || "",
      role: u.role || "",
      companyId: u.companyId?.toString() || "",
      phone: u.phone || "",
      address: u.address || "",
      birthDate: u.birthDate || "",
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editingUser) return;
    if (!editForm.fullName) {
      toast({ title: "Error", description: "Nama lengkap wajib diisi", variant: "destructive" });
      return;
    }
    editMutation.mutate({
      userId: editingUser.id,
      data: {
        fullName: editForm.fullName,
        position: editForm.position || null,
        role: editForm.role,
        companyId: editForm.companyId ? parseInt(editForm.companyId) : null,
        phone: editForm.phone || null,
        address: editForm.address || null,
        birthDate: editForm.birthDate || null,
      },
    });
  };

  const handleToggleActive = () => {
    if (toggleActiveDialog.userId) {
      toggleActiveMutation.mutate({ userId: toggleActiveDialog.userId, isActive: !toggleActiveDialog.currentlyActive });
    }
  };

  const handleResetPassword = () => {
    if (!newPassword || newPassword.length < 8) {
      toast({ title: "Error", description: "Password minimal 8 karakter", variant: "destructive" });
      return;
    }
    if (resetUserId) resetMutation.mutate({ userId: resetUserId, newPassword });
  };

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
      position: form.position || null,
      phone: form.phone || null,
      address: form.address || null,
      isActive: true,
    });
  };

  const getCompanyName = (id: number | null) => {
    if (!id) return "Semua PT";
    return companiesData?.find(c => c.id === id)?.code || "-";
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-4xl mx-auto">
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
              <div className="space-y-1.5">
                <Label>Jabatan</Label>
                <Input data-testid="input-user-position" placeholder="Jabatan / posisi" value={form.position} onChange={e => setForm({...form, position: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Telepon</Label>
                  <Input data-testid="input-user-phone" placeholder="No. telepon" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>Alamat</Label>
                  <Input data-testid="input-user-address" placeholder="Alamat" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
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
                    {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt={u.fullName} /> : null}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{u.fullName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span>@{u.username}</span>
                      {u.position && <span>{u.position}</span>}
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{getCompanyName(u.companyId)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {!u.isActive && (
                      <Badge variant="destructive" data-testid={`badge-inactive-${u.id}`}>Nonaktif</Badge>
                    )}
                    {isSuperadmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-edit-user-${u.id}`}
                        onClick={() => openEditDialog(u)}
                      >
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`button-reset-pw-${u.id}`}
                      onClick={() => { setResetUserId(u.id); setResetUserName(u.fullName); setNewPassword(""); setResetDialogOpen(true); }}
                    >
                      <KeyRound className="w-3 h-3 mr-1" /> Reset
                    </Button>
                    {isSuperadmin && u.id !== currentUser?.id && u.role !== "superadmin" && (
                      u.isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-deactivate-${u.id}`}
                          onClick={() => setToggleActiveDialog({ open: true, userId: u.id, userName: u.fullName, currentlyActive: true })}
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> Nonaktifkan
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-activate-${u.id}`}
                          onClick={() => setToggleActiveDialog({ open: true, userId: u.id, userName: u.fullName, currentlyActive: false })}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" /> Aktifkan
                        </Button>
                      )
                    )}
                    <Badge variant={u.isActive ? "default" : "secondary"}>
                      {getRoleLabel(u.role)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Reset password untuk <strong>{resetUserName}</strong></p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Password Baru</Label>
              <Input
                data-testid="input-reset-password"
                type="password"
                placeholder="Minimal 8 karakter"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <Button data-testid="button-confirm-reset" onClick={handleResetPassword} className="w-full" disabled={resetMutation.isPending}>
              {resetMutation.isPending ? "Memproses..." : "Reset Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={toggleActiveDialog.open} onOpenChange={(open) => { if (!open) setToggleActiveDialog({ open: false, userId: null, userName: "", currentlyActive: true }); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-toggle-active-title">
              {toggleActiveDialog.currentlyActive ? "Nonaktifkan User" : "Aktifkan Kembali User"}
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="text-toggle-active-desc">
              {toggleActiveDialog.currentlyActive
                ? `Nonaktifkan user ${toggleActiveDialog.userName}? User tidak akan bisa login lagi.`
                : `Aktifkan kembali user ${toggleActiveDialog.userName}? User akan bisa login kembali.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-toggle">Batal</AlertDialogCancel>
            <AlertDialogAction data-testid="button-confirm-toggle" onClick={handleToggleActive} disabled={toggleActiveMutation.isPending}>
              {toggleActiveMutation.isPending ? "Memproses..." : toggleActiveDialog.currentlyActive ? "Nonaktifkan" : "Aktifkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editDialogOpen} onOpenChange={(o) => { setEditDialogOpen(o); if (!o) setEditingUser(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit User: {editingUser?.fullName}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input value={editingUser?.username || ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Username tidak dapat diubah</p>
            </div>
            <div className="space-y-1.5">
              <Label>Nama Lengkap *</Label>
              <Input data-testid="input-edit-fullname" placeholder="Nama lengkap" value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label>Jabatan</Label>
              <Input data-testid="input-edit-position" placeholder="Jabatan / posisi" value={editForm.position} onChange={e => setEditForm({...editForm, position: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={editForm.role} onValueChange={v => setEditForm({...editForm, role: v})}>
                  <SelectTrigger data-testid="select-edit-role"><SelectValue /></SelectTrigger>
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
                <Select value={editForm.companyId} onValueChange={v => setEditForm({...editForm, companyId: v})}>
                  <SelectTrigger data-testid="select-edit-company"><SelectValue placeholder="Pilih PT" /></SelectTrigger>
                  <SelectContent>
                    {companiesData?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Telepon</Label>
                <Input data-testid="input-edit-phone" placeholder="No. telepon" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Lahir</Label>
                <Input data-testid="input-edit-birthdate" type="date" value={editForm.birthDate} onChange={e => setEditForm({...editForm, birthDate: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Alamat</Label>
              <Input data-testid="input-edit-address" placeholder="Alamat lengkap" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} />
            </div>
            <Button data-testid="button-submit-edit-user" onClick={handleEditSubmit} className="w-full" disabled={editMutation.isPending}>
              {editMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
