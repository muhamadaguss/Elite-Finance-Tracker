import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, LogIn, UserPlus, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<{ error?: string }>;
  onRegister: (data: { username: string; password: string; firstName?: string; lastName?: string }) => Promise<{ error?: string }>;
}

export default function LoginPage({ onLogin, onRegister }: LoginPageProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = isRegister
      ? await onRegister({ username, password, firstName: firstName || undefined })
      : await onLogin(username, password);

    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="glass rounded-3xl p-10 max-w-md w-full relative z-10"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30 mx-auto mb-6"
        >
          <Wallet className="w-10 h-10 text-white" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-extrabold tracking-tight text-gradient mb-1 text-center"
        >
          Lumina
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground mb-8 text-center"
        >
          Personal Finance Tracker
        </motion.p>

        <AnimatePresence mode="wait">
          <motion.form
            key={isRegister ? "register" : "login"}
            initial={{ opacity: 0, x: isRegister ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRegister ? -20 : 20 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {isRegister && (
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Nama</label>
                <Input
                  type="text"
                  placeholder="Nama kamu (opsional)"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-12 rounded-xl bg-muted/50 border-border"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Username</label>
              <Input
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="h-12 rounded-xl bg-muted/50 border-border"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  className="h-12 rounded-xl bg-muted/50 border-border pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2.5"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 text-base font-semibold rounded-xl gap-3"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isRegister ? (
                <UserPlus className="w-5 h-5" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {loading ? "Mohon tunggu..." : isRegister ? "Daftar" : "Masuk"}
            </Button>
          </motion.form>
        </AnimatePresence>

        <p className="text-sm text-muted-foreground text-center mt-6">
          {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(""); }}
            className="text-primary font-semibold hover:underline"
          >
            {isRegister ? "Masuk" : "Daftar"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
