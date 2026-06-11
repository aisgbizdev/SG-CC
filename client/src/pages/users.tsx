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
import type { Branch, Company } from "@shared/schema";

const NO_COMPANY = "__none__";
const emptyUserForm = {
  username: "", password: "", fullName: "",
  role: "dk", companyId: "",
  branch: "",
  secretQuestion: "Nama ibu kandung", secretAnswer: "",
};

export default function UsersPage() {
  usePageTitle("Manajemen User");
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const isSuperadmin = currentUser?.role === "superadmin";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetUserName, setResetUserName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [toggleActiveDialog, setToggleActiveDialog] = useState<{ open: boolean; userId: number | null; userName: string; currentlyActive: boolean }>({ open: false, userId: null, userName: "", currentlyActive: true });

  const { data: usersData, isLoading } = useQuery<any[]>({ queryKey: ["/api/users"] });
  const { data: companiesData } = useQuery<Company[]>({ queryKey: ["/api/companies"] });

  const [form, setForm] = useState(emptyUserForm);
  const [editForm, setEditForm] = useState({
    username: "", fullName: "", role: "dk", companyId: "", branch: "", isActive: true,
    secretQuestion: "Nama ibu kandung", secretAnswer: "",
  });
  const { data: branchesData } = useQuery<Branch[]>({
    queryKey: ["/api/companies", form.companyId, "branches"],
    queryFn: async () => {
      if (!form.companyId || form.companyId === NO_COMPANY) return [];
      const res = await fetch(`/api/companies/${form.companyId}/branches`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal mengambil data cabang");
      return res.json();
    },
    enabled: !!form.companyId && form.companyId !== NO_COMPANY,
  });
  const { data: editBranchesData } = useQuery<Branch[]>({
    queryKey: ["/api/companies", editForm.companyId, "branches", "edit-user"],
    queryFn: async () => {
      if (!editForm.companyId) return [];
      const res = await fetch(`/api/companies/${editForm.companyId}/branches`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal mengambil data cabang");
      return res.json();
    },
    enabled: !!editForm.companyId && editForm.companyId !== NO_COMPANY,
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
      setForm(emptyUserForm);
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal membuat user", variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Berhasil", description: "User berhasil diperbarui" });
      setEditDialogOpen(false);
      setEditingUserId(null);
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal memperbarui user", variant: "destructive" });
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
      companyId: form.companyId && form.companyId !== NO_COMPANY ? parseInt(form.companyId) : null,
      isActive: true,
    });
  };

  const openEditDialog = (u: any) => {
    setEditingUserId(u.id);
    setEditForm({
      username: u.username || "",
      fullName: u.fullName || "",
      role: u.role || "dk",
      companyId: u.companyId ? String(u.companyId) : "",
      branch: u.branch || "",
      isActive: u.isActive !== false,
      secretQuestion: u.secretQuestion || "Nama ibu kandung",
      secretAnswer: "",
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editingUserId) return;
    if (!editForm.username || !editForm.fullName) {
      toast({ title: "Error", description: "Username dan nama lengkap wajib diisi", variant: "destructive" });
      return;
    }
    if (editingUserId === currentUser?.id && editForm.role !== "superadmin") {
      toast({ title: "Error", description: "Tidak bisa mengubah role akun superadmin yang sedang dipakai", variant: "destructive" });
      return;
    }
    editMutation.mutate({
      userId: editingUserId,
      data: {
        username: editForm.username,
        fullName: editForm.fullName,
        role: editForm.role,
        companyId: editForm.companyId && editForm.companyId !== NO_COMPANY ? parseInt(editForm.companyId) : null,
        branch: editForm.branch || null,
        isActive: editForm.isActive,
        secretQuestion: editForm.secretQuestion || null,
        ...(editForm.secretAnswer ? { secretAnswer: editForm.secretAnswer } : {}),
      },
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
                      <SelectItem value="cbo">CBO</SelectItem>
                      <SelectItem value="ceo">CEO</SelectItem>
                      <SelectItem value="kepatuhan_cabang">Kepatuhan Cabang</SelectItem>
                      <SelectItem value="apuppt">APUPPT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>PT</Label>
                  <Select value={form.companyId} onValueChange={v => setForm({...form, companyId: v, branch: ""})}>
                    <SelectTrigger><SelectValue placeholder="Pilih PT" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_COMPANY}>Semua PT / Tanpa PT</SelectItem>
                      {companiesData?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.code}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Cabang</Label>
                <Select value={form.branch} onValueChange={v => setForm({...form, branch: v})} disabled={!form.companyId || form.companyId === NO_COMPANY}>
                  <SelectTrigger><SelectValue placeholder={form.companyId && form.companyId !== NO_COMPANY ? "Pilih Cabang" : "Pilih PT dulu"} /></SelectTrigger>
                  <SelectContent>
                    {branchesData?.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{getCompanyName(u.companyId)}</span>
                      {u.branch && <span className="flex items-center gap-1"><User className="w-3 h-3" />{u.branch}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {!u.isActive && (
                      <Badge variant="destructive" data-testid={`badge-inactive-${u.id}`}>Nonaktif</Badge>
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
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditingUserId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Username *</Label>
                <Input data-testid="input-edit-user-username" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editForm.isActive ? "active" : "inactive"} onValueChange={v => setEditForm({...editForm, isActive: v === "active"})}>
                  <SelectTrigger data-testid="select-edit-user-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nama Lengkap *</Label>
              <Input data-testid="input-edit-user-fullname" value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={editForm.role} onValueChange={v => setEditForm({...editForm, role: v})}>
                  <SelectTrigger data-testid="select-edit-user-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="du">Direktur Utama</SelectItem>
                    <SelectItem value="dk">Direktur Kepatuhan</SelectItem>
                    <SelectItem value="cbo">CBO</SelectItem>
                    <SelectItem value="ceo">CEO</SelectItem>
                    <SelectItem value="kepatuhan_cabang">Kepatuhan Cabang</SelectItem>
                    <SelectItem value="apuppt">APUPPT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>PT</Label>
                <Select value={editForm.companyId || NO_COMPANY} onValueChange={v => setEditForm({...editForm, companyId: v === NO_COMPANY ? "" : v, branch: ""})}>
                  <SelectTrigger data-testid="select-edit-user-company"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_COMPANY}>Semua PT / Tanpa PT</SelectItem>
                    {companiesData?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cabang</Label>
              <Select value={editForm.branch} onValueChange={v => setEditForm({...editForm, branch: v})} disabled={!editForm.companyId || editForm.companyId === NO_COMPANY}>
                <SelectTrigger data-testid="select-edit-user-branch"><SelectValue placeholder={editForm.companyId && editForm.companyId !== NO_COMPANY ? "Pilih Cabang" : "Pilih PT dulu"} /></SelectTrigger>
                <SelectContent>
                  {editBranchesData?.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Pertanyaan Rahasia</Label>
                <Select value={editForm.secretQuestion} onValueChange={v => setEditForm({...editForm, secretQuestion: v})}>
                  <SelectTrigger data-testid="select-edit-user-secret-question"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nama ibu kandung">Nama ibu kandung</SelectItem>
                    <SelectItem value="Kota lahir">Kota lahir</SelectItem>
                    <SelectItem value="Nama sekolah pertama">Nama sekolah pertama</SelectItem>
                    <SelectItem value="Nama hewan peliharaan">Nama hewan peliharaan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Jawaban Baru</Label>
                <Input data-testid="input-edit-user-secret-answer" placeholder="Kosongkan jika tidak diubah" value={editForm.secretAnswer} onChange={e => setEditForm({...editForm, secretAnswer: e.target.value})} />
              </div>
            </div>
            <Button data-testid="button-submit-edit-user" onClick={handleEditSubmit} className="w-full" disabled={editMutation.isPending}>
              {editMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
