import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { usePageTitle } from "@/hooks/use-page-title";
import { Building2, Pencil, Trash2, Plus, Users, FileText, ClipboardList, Megaphone, MapPin, Phone, Mail, User, Calendar, Shield, GitBranch } from "lucide-react";
import type { Company, Branch } from "@shared/schema";
import { apiUrl } from "@/lib/queryClient";

interface CompanyDetail {
  company: Company;
  branches: Branch[];
  users: { id: number; fullName: string; role: string; username: string; isActive: boolean }[];
  rekapKasus: Record<string, { total: number; open: number; closed: number; inProgress: number }>;
  rekapAktivitas: { total: number };
  rekapTugas: { total: number; selesai: number; belumSelesai: number };
  rekapPengumuman: { total: number };
}

export default function CompanyDetailPage() {
  const [, params] = useRoute("/companies/:id");
  const [, setLocation] = useLocation();
  const companyId = params?.id;
  usePageTitle("Detail PT");
  const { toast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [deleteBranchId, setDeleteBranchId] = useState<number | null>(null);
  const [toggleActiveOpen, setToggleActiveOpen] = useState(false);

  const [companyForm, setCompanyForm] = useState({
    name: "", code: "", address: "", phone: "", email: "",
    directorName: "", foundedDate: "", licenseNumber: "",
    duName: "", dkName: "",
  });

  const [branchForm, setBranchForm] = useState({
    name: "", address: "", headName: "", wpbCount: 0,
  });

  const { data, isLoading } = useQuery<CompanyDetail>({
    queryKey: ["/api/companies", companyId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/companies/${companyId}`), { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat data");
      return res.json();
    },
    enabled: !!companyId,
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (formData: any) => {
      const { duName, dkName, ...companyData } = formData;
      const res = await apiRequest("PATCH", `/api/companies/${companyId}`, companyData);
      const du = data?.users.find((u) => u.role === "du");
      const dk = data?.users.find((u) => u.role === "dk");
      if (du && duName && duName !== du.fullName) {
        await apiRequest("PATCH", `/api/users/${du.id}`, { fullName: duName });
      }
      if (dk && dkName && dkName !== dk.fullName) {
        await apiRequest("PATCH", `/api/users/${dk.id}`, { fullName: dkName });
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Berhasil", description: "Data PT berhasil diperbarui" });
      setEditOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal memperbarui data", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/companies/${companyId}`, {
        isActive: !data?.company.isActive,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Berhasil", description: data?.company.isActive ? "PT dinonaktifkan" : "PT diaktifkan kembali" });
      setToggleActiveOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await apiRequest("POST", `/api/companies/${companyId}/branches`, formData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      toast({ title: "Berhasil", description: "Cabang berhasil ditambahkan" });
      setBranchDialogOpen(false);
      setBranchForm({ name: "", address: "", headName: "", wpbCount: 0 });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const updateBranchMutation = useMutation({
    mutationFn: async ({ id, data: formData }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/branches/${id}`, formData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      toast({ title: "Berhasil", description: "Cabang berhasil diperbarui" });
      setEditBranch(null);
      setBranchForm({ name: "", address: "", headName: "", wpbCount: 0 });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/branches/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      toast({ title: "Berhasil", description: "Cabang berhasil dihapus" });
      setDeleteBranchId(null);
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const openEditCompany = () => {
    if (!data) return;
    const c = data.company;
    const du = data.users.find((u) => u.role === "du");
    const dk = data.users.find((u) => u.role === "dk");
    setCompanyForm({
      name: c.name || "", code: c.code || "", address: c.address || "",
      phone: c.phone || "", email: c.email || "",
      directorName: c.directorName || "", foundedDate: c.foundedDate || "",
      licenseNumber: c.licenseNumber || "",
      duName: du?.fullName || "", dkName: dk?.fullName || "",
    });
    setEditOpen(true);
  };

  const openEditBranch = (branch: Branch) => {
    setEditBranch(branch);
    setBranchForm({
      name: branch.name || "", address: branch.address || "",
      headName: branch.headName || "", wpbCount: branch.wpbCount || 0,
    });
  };

  const openAddBranch = () => {
    setBranchForm({ name: "", address: "", headName: "", wpbCount: 0 });
    setBranchDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">PT tidak ditemukan</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/companies")} data-testid="button-back-companies">Kembali</Button>
      </div>
    );
  }

  const { company, branches: branchList, users: userList, rekapKasus, rekapAktivitas, rekapTugas, rekapPengumuman } = data;
  const totalKasus = Object.values(rekapKasus).reduce((sum, r) => sum + r.total, 0);
  const duUser = userList.find((u) => u.role === "du");
  const dkUser = userList.find((u) => u.role === "dk");

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-company-name">{company.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline">{company.code}</Badge>
              <Badge variant={company.isActive ? "default" : "secondary"}>
                {company.isActive ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openEditCompany} data-testid="button-edit-company">
            <Pencil className="w-4 h-4 mr-1" /> Edit
          </Button>
          <Button
            variant={company.isActive ? "destructive" : "default"}
            size="sm"
            onClick={() => setToggleActiveOpen(true)}
            data-testid="button-toggle-active"
          >
            {company.isActive ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Informasi Perusahaan</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="Alamat" value={company.address} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Telepon" value={company.phone} />
            <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={company.email} />
            <InfoRow icon={<User className="w-4 h-4" />} label="Direktur Utama" value={company.directorName} />
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Tanggal Berdiri" value={company.foundedDate} />
            <InfoRow icon={<Shield className="w-4 h-4" />} label="No. Izin BAPPEBTI" value={company.licenseNumber} />
            <InfoRow icon={<User className="w-4 h-4" />} label="Direktur Utama (DU)" value={duUser?.fullName} />
            <InfoRow icon={<User className="w-4 h-4" />} label="Direktur Kepatuhan (DK)" value={dkUser?.fullName} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Daftar Cabang</CardTitle>
          <Button size="sm" onClick={openAddBranch} data-testid="button-add-branch">
            <Plus className="w-4 h-4 mr-1" /> Tambah Cabang
          </Button>
        </CardHeader>
        <CardContent>
          {branchList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada cabang terdaftar</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Nama Cabang</th>
                    <th className="pb-2 font-medium">Alamat</th>
                    <th className="pb-2 font-medium">Kepala Cabang</th>
                    <th className="pb-2 font-medium text-center">Jumlah WPB</th>
                    <th className="pb-2 font-medium text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {branchList.map((b) => (
                    <tr key={b.id} className="border-b last:border-0" data-testid={`row-branch-${b.id}`}>
                      <td className="py-2.5 font-medium">{b.name}</td>
                      <td className="py-2.5 text-muted-foreground">{b.address || "-"}</td>
                      <td className="py-2.5">{b.headName || "-"}</td>
                      <td className="py-2.5 text-center">{b.wpbCount || 0}</td>
                      <td className="py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditBranch(b)} data-testid={`button-edit-branch-${b.id}`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteBranchId(b.id)} data-testid={`button-delete-branch-${b.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Rekap Data</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={<FileText className="w-5 h-5" />} label="Total Kasus" value={totalKasus} />
            <StatCard icon={<ClipboardList className="w-5 h-5" />} label="Aktivitas" value={rekapAktivitas.total} />
            <StatCard icon={<GitBranch className="w-5 h-5" />} label="Tugas" value={`${rekapTugas.selesai}/${rekapTugas.total}`} sub="selesai" />
            <StatCard icon={<Megaphone className="w-5 h-5" />} label="Pengumuman" value={rekapPengumuman.total} />
          </div>

          {Object.keys(rekapKasus).length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">Kasus per Cabang</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Cabang</th>
                      <th className="pb-2 font-medium text-center">Total</th>
                      <th className="pb-2 font-medium text-center">Open</th>
                      <th className="pb-2 font-medium text-center">In Progress</th>
                      <th className="pb-2 font-medium text-center">Closed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(rekapKasus).sort((a, b) => b[1].total - a[1].total).map(([branch, r]) => (
                      <tr key={branch} className="border-b last:border-0" data-testid={`row-rekap-${branch}`}>
                        <td className="py-2">{branch}</td>
                        <td className="py-2 text-center font-medium">{r.total}</td>
                        <td className="py-2 text-center"><Badge variant="outline" className="text-xs">{r.open}</Badge></td>
                        <td className="py-2 text-center"><Badge variant="secondary" className="text-xs">{r.inProgress}</Badge></td>
                        <td className="py-2 text-center"><Badge className="text-xs bg-green-600">{r.closed}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Daftar Pengurus</CardTitle></CardHeader>
        <CardContent>
          {userList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada user terdaftar</p>
          ) : (
            <div className="space-y-2">
              {userList.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`row-user-${u.id}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs uppercase">{u.role}</Badge>
                    <Badge variant={u.isActive ? "default" : "secondary"} className="text-xs">
                      {u.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Informasi PT</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nama PT</Label>
              <Input data-testid="input-edit-name" value={companyForm.name} onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Kode</Label>
              <Input data-testid="input-edit-code" value={companyForm.code} onChange={e => setCompanyForm({ ...companyForm, code: e.target.value.toUpperCase() })} maxLength={10} />
            </div>
            <div className="space-y-1.5">
              <Label>Alamat</Label>
              <Input data-testid="input-edit-address" value={companyForm.address} onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Telepon</Label>
                <Input data-testid="input-edit-phone" value={companyForm.phone} onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input data-testid="input-edit-email" value={companyForm.email} onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Direktur Utama</Label>
              <Input data-testid="input-edit-director" value={companyForm.directorName} onChange={e => setCompanyForm({ ...companyForm, directorName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tanggal Berdiri</Label>
                <Input data-testid="input-edit-founded" value={companyForm.foundedDate} onChange={e => setCompanyForm({ ...companyForm, foundedDate: e.target.value })} placeholder="cth: 2005-01-15" />
              </div>
              <div className="space-y-1.5">
                <Label>No. Izin BAPPEBTI</Label>
                <Input data-testid="input-edit-license" value={companyForm.licenseNumber} onChange={e => setCompanyForm({ ...companyForm, licenseNumber: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nama DU</Label>
                <Input data-testid="input-edit-du-name" value={companyForm.duName} onChange={e => setCompanyForm({ ...companyForm, duName: e.target.value })} placeholder="Nama Direktur Utama" />
              </div>
              <div className="space-y-1.5">
                <Label>Nama DK</Label>
                <Input data-testid="input-edit-dk-name" value={companyForm.dkName} onChange={e => setCompanyForm({ ...companyForm, dkName: e.target.value })} placeholder="Nama Direktur Kepatuhan" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button onClick={() => updateCompanyMutation.mutate(companyForm)} disabled={updateCompanyMutation.isPending} data-testid="button-save-company">
              {updateCompanyMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Cabang Baru</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nama Cabang *</Label>
              <Input data-testid="input-branch-name" value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} placeholder="cth: Cabang Jakarta Selatan" />
            </div>
            <div className="space-y-1.5">
              <Label>Alamat</Label>
              <Input data-testid="input-branch-address" value={branchForm.address} onChange={e => setBranchForm({ ...branchForm, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kepala Cabang</Label>
                <Input data-testid="input-branch-head" value={branchForm.headName} onChange={e => setBranchForm({ ...branchForm, headName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Jumlah WPB</Label>
                <Input data-testid="input-branch-wpb" type="number" min={0} value={branchForm.wpbCount} onChange={e => setBranchForm({ ...branchForm, wpbCount: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBranchDialogOpen(false)}>Batal</Button>
            <Button onClick={() => createBranchMutation.mutate(branchForm)} disabled={createBranchMutation.isPending || !branchForm.name.trim()} data-testid="button-save-branch">
              {createBranchMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editBranch} onOpenChange={(open) => { if (!open) setEditBranch(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Cabang</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nama Cabang *</Label>
              <Input data-testid="input-edit-branch-name" value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Alamat</Label>
              <Input data-testid="input-edit-branch-address" value={branchForm.address} onChange={e => setBranchForm({ ...branchForm, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kepala Cabang</Label>
                <Input data-testid="input-edit-branch-head" value={branchForm.headName} onChange={e => setBranchForm({ ...branchForm, headName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Jumlah WPB</Label>
                <Input data-testid="input-edit-branch-wpb" type="number" min={0} value={branchForm.wpbCount} onChange={e => setBranchForm({ ...branchForm, wpbCount: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBranch(null)}>Batal</Button>
            <Button onClick={() => editBranch && updateBranchMutation.mutate({ id: editBranch.id, data: branchForm })} disabled={updateBranchMutation.isPending || !branchForm.name.trim()} data-testid="button-update-branch">
              {updateBranchMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteBranchId !== null} onOpenChange={(open) => { if (!open) setDeleteBranchId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Cabang?</AlertDialogTitle>
            <AlertDialogDescription>Cabang ini akan dihapus. Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteBranchId && deleteBranchMutation.mutate(deleteBranchId)} data-testid="button-confirm-delete-branch">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={toggleActiveOpen} onOpenChange={setToggleActiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{company.isActive ? "Nonaktifkan PT?" : "Aktifkan PT?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {company.isActive
                ? "PT ini akan dinonaktifkan. User yang terdaftar tidak akan bisa mengakses sistem."
                : "PT ini akan diaktifkan kembali."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => toggleActiveMutation.mutate()} data-testid="button-confirm-toggle">
              {company.isActive ? "Nonaktifkan" : "Aktifkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value || "-"}</p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | string; sub?: string }) {
  return (
    <div className="p-3 rounded-lg border text-center">
      <div className="flex items-center justify-center text-primary mb-1">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}{sub ? ` (${sub})` : ""}</p>
    </div>
  );
}
