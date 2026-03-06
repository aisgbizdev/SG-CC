import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Eye, EyeOff, Lock, User, HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<"username" | "answer">("username");
  const [forgotUsername, setForgotUsername] = useState("");
  const [secretQuestion, setSecretQuestion] = useState("");
  const [secretAnswer, setSecretAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(username, password);
      setLocation("/");
    } catch (err: any) {
      toast({
        title: "Login Gagal",
        description: err.message?.includes(":") ? err.message.split(": ").slice(1).join(": ") : "Username atau password salah",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotUsername = async () => {
    try {
      const res = await fetch(`/api/auth/secret-question/${forgotUsername}`);
      if (!res.ok) throw new Error("Username tidak ditemukan");
      const data = await res.json();
      setSecretQuestion(data.question);
      setForgotStep("answer");
    } catch {
      toast({ title: "Error", description: "Username tidak ditemukan atau belum memiliki pertanyaan rahasia", variant: "destructive" });
    }
  };

  const handleResetPassword = async () => {
    try {
      const res = await apiRequest("POST", "/api/auth/forgot-password", {
        username: forgotUsername,
        secretAnswer,
        newPassword,
      });
      toast({ title: "Berhasil", description: "Password berhasil diubah. Silakan login." });
      setForgotOpen(false);
      setForgotStep("username");
      setForgotUsername("");
      setSecretAnswer("");
      setNewPassword("");
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message?.includes(":") ? err.message.split(": ").slice(1).join(": ") : "Jawaban salah atau password tidak valid", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-primary rounded-md flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SG Control Center</h1>
          <p className="text-sm text-muted-foreground">Pusat Kendali Internal Grup SG</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <h2 className="text-lg font-semibold text-center">Masuk ke Akun Anda</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="input-username"
                    id="username"
                    placeholder="Masukkan username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="input-password"
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                data-testid="button-login"
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Memproses..." : "Masuk"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Dialog open={forgotOpen} onOpenChange={(open) => { setForgotOpen(open); if (!open) { setForgotStep("username"); } }}>
                <DialogTrigger asChild>
                  <button className="text-sm text-muted-foreground flex items-center gap-1 mx-auto" data-testid="link-forgot-password">
                    <HelpCircle className="w-3 h-3" /> Lupa Password?
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                  </DialogHeader>
                  {forgotStep === "username" ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Username</Label>
                        <Input
                          data-testid="input-forgot-username"
                          placeholder="Masukkan username Anda"
                          value={forgotUsername}
                          onChange={(e) => setForgotUsername(e.target.value)}
                        />
                      </div>
                      <Button data-testid="button-forgot-next" onClick={handleForgotUsername} className="w-full">Lanjut</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm font-medium">Pertanyaan Rahasia:</p>
                        <p className="text-sm text-muted-foreground">{secretQuestion}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Jawaban</Label>
                        <Input
                          data-testid="input-secret-answer"
                          placeholder="Masukkan jawaban"
                          value={secretAnswer}
                          onChange={(e) => setSecretAnswer(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Password Baru</Label>
                        <Input
                          data-testid="input-new-password"
                          type="password"
                          placeholder="Minimal 8 karakter"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>
                      <Button data-testid="button-reset-password" onClick={handleResetPassword} className="w-full">Reset Password</Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          Demo: username <span className="font-mono">superadmin1</span> / password <span className="font-mono">admin123</span>
        </p>
      </div>
    </div>
  );
}
