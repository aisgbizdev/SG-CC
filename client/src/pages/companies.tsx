import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, MapPin } from "lucide-react";
import type { Company } from "@shared/schema";

export default function CompaniesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", address: "" });

  const { data: companies, isLoading } = useQuery<Company[]>({ queryKey: ["/api/companies"] });
  const { data: usersData } = useQuery<any[]>({ queryKey: ["/api/users"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/companies", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Berhasil", description: "PT berhasil ditambahkan" });
      setDialogOpen(false);
      setForm({ name: "", code: "", address: "" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Gagal menambah PT", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!form.name || !form.code) {
      toast({ title: "Error", description: "Nama dan kode PT wajib diisi", variant: "destructive" });
      return;
    }
    createMutation.mutate({ ...form, isActive: true });
  };

  const getUserCount = (companyId: number) => {
    return usersData?.filter((u: any) => u.companyId === companyId).length || 0;
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Manajemen PT</h1>
          <p className="text-sm text-muted-foreground">{companies?.length || 0} perusahaan terdaftar</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-company"><Plus className="w-4 h-4 mr-1" /> Tambah PT</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah PT Baru</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nama PT *</Label>
                <Input data-testid="input-company-name" placeholder="PT Nama Perusahaan" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Kode *</Label>
                <Input data-testid="input-company-code" placeholder="Contoh: SGB" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} maxLength={10} />
              </div>
              <div className="space-y-1.5">
                <Label>Alamat</Label>
                <Input data-testid="input-company-address" placeholder="Alamat kantor pusat" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <Button data-testid="button-submit-company" onClick={handleSubmit} className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <div className="space-y-2">
          {companies?.map((c) => (
            <Card key={c.id} data-testid={`card-company-${c.id}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium" data-testid={`text-company-name-${c.id}`}>{c.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <Badge variant="outline" className="text-xs">{c.code}</Badge>
                    {c.address && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.address}</span>
                    )}
                    <span>{getUserCount(c.id)} user</span>
                  </div>
                </div>
                <Badge variant={c.isActive ? "default" : "secondary"}>
                  {c.isActive ? "Aktif" : "Nonaktif"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
