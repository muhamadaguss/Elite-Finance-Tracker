import * as React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ScanLine, Upload, Camera, Check, X, Loader2, ArrowRight, Receipt } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ScanResult {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  categoryId: number | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  items?: { name: string; price: number }[];
  notes: string | null;
  confidence: "high" | "medium" | "low";
}

type ScanState = "idle" | "uploading" | "scanned" | "saving" | "saved" | "error";

export default function ReceiptScan() {
  const [scanState, setScanState] = React.useState<ScanState>("idle");
  const [result, setResult] = React.useState<ScanResult | null>(null);
  const [editedResult, setEditedResult] = React.useState<ScanResult | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const BASE = import.meta.env.BASE_URL || "/";
  const apiBase = `${window.location.origin}${BASE}api`.replace(/\/+api/, "/api");

  const handleFile = async (file: File) => {
    setScanState("uploading");
    setError(null);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    const formData = new FormData();
    formData.append("receipt", file);

    try {
      const resp = await fetch(`${apiBase}/receipt/scan`, {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Failed to scan receipt");
      }

      const data: ScanResult = await resp.json();
      setResult(data);
      setEditedResult({ ...data });
      setScanState("scanned");
    } catch (err: any) {
      setError(err.message || "Failed to scan receipt");
      setScanState("error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const handleConfirm = async () => {
    if (!editedResult) return;
    setScanState("saving");

    try {
      const resp = await fetch(`${apiBase}/receipt/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editedResult.date,
          description: editedResult.description,
          amount: editedResult.amount,
          type: editedResult.type,
          categoryId: editedResult.categoryId,
          notes: editedResult.notes,
        }),
      });

      if (!resp.ok) throw new Error("Failed to save transaction");
      setScanState("saved");
    } catch (err: any) {
      setError(err.message);
      setScanState("error");
    }
  };

  const handleReset = () => {
    setScanState("idle");
    setResult(null);
    setEditedResult(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Scan Struk</h1>
          <p className="text-muted-foreground mt-1">Upload foto struk dan AI akan otomatis membaca datanya.</p>
        </div>

        <AnimatePresence mode="wait">
          {scanState === "idle" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <GlassCard
                className="relative cursor-pointer group"
                onDrop={handleDrop}
                onDragOver={(e: React.DragEvent) => e.preventDefault()}
              >
                <div className="flex flex-col items-center justify-center py-16 gap-6">
                  <div className="w-24 h-24 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <ScanLine className="w-12 h-12 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-foreground mb-2">Upload Struk</h3>
                    <p className="text-muted-foreground text-sm max-w-sm">
                      Drag & drop foto struk ke sini, atau pilih dari galeri / kamera
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" /> Pilih File
                    </Button>
                    <Button variant="outline" onClick={() => cameraInputRef.current?.click()}>
                      <Camera className="w-4 h-4 mr-2" /> Kamera
                    </Button>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </GlassCard>
            </motion.div>
          )}

          {scanState === "uploading" && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <GlassCard>
                <div className="flex flex-col items-center justify-center py-16 gap-6">
                  {previewUrl && (
                    <div className="w-48 h-48 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                      <img src={previewUrl} alt="Receipt" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <span className="text-lg font-semibold text-foreground">Menganalisis struk...</span>
                  </div>
                  <p className="text-sm text-muted-foreground">AI sedang membaca data dari struk Anda</p>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {(scanState === "scanned" || scanState === "saving") && editedResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {previewUrl && (
                  <GlassCard className="overflow-hidden">
                    <h3 className="text-sm font-bold text-muted-foreground mb-3">Foto Struk</h3>
                    <div className="rounded-xl overflow-hidden border border-white/10">
                      <img src={previewUrl} alt="Receipt" className="w-full max-h-[400px] object-contain bg-black/20" />
                    </div>
                  </GlassCard>
                )}

                <GlassCard>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-muted-foreground">Hasil Scan</h3>
                    <span
                      className={cn(
                        "text-xs font-semibold px-2.5 py-1 rounded-full",
                        editedResult.confidence === "high" && "bg-success/20 text-success",
                        editedResult.confidence === "medium" && "bg-yellow-500/20 text-yellow-400",
                        editedResult.confidence === "low" && "bg-destructive/20 text-destructive"
                      )}
                    >
                      {editedResult.confidence === "high" ? "Akurasi Tinggi" : editedResult.confidence === "medium" ? "Akurasi Sedang" : "Akurasi Rendah"}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-black/20 border border-white/5">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                        editedResult.type === "income" ? "bg-success/20" : "bg-destructive/20"
                      )}>
                        {editedResult.type === "income" ? "💰" : "🧾"}
                      </div>
                      <div className="flex-1">
                        <span className={cn(
                          "text-xs font-bold uppercase tracking-wider",
                          editedResult.type === "income" ? "text-success" : "text-destructive"
                        )}>
                          {editedResult.type === "income" ? "Pemasukan" : "Pengeluaran"}
                        </span>
                        <div className="text-2xl font-black text-foreground mt-0.5">{formatCurrency(editedResult.amount)}</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Tanggal</label>
                        <Input
                          type="date"
                          value={editedResult.date}
                          onChange={(e) => setEditedResult({ ...editedResult, date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Deskripsi</label>
                        <Input
                          value={editedResult.description}
                          onChange={(e) => setEditedResult({ ...editedResult, description: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Jumlah (IDR)</label>
                        <Input
                          type="number"
                          value={editedResult.amount}
                          onChange={(e) => setEditedResult({ ...editedResult, amount: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Tipe</label>
                        <select
                          className="flex h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          value={editedResult.type}
                          onChange={(e) => setEditedResult({ ...editedResult, type: e.target.value as "income" | "expense" })}
                        >
                          <option value="expense">Pengeluaran</option>
                          <option value="income">Pemasukan</option>
                        </select>
                      </div>

                      {editedResult.categoryName && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">Kategori:</span>
                          <span className="text-sm font-medium text-foreground">
                            {editedResult.categoryIcon} {editedResult.categoryName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {editedResult.items && editedResult.items.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <h4 className="text-xs font-bold text-muted-foreground mb-2">Item Detail</h4>
                      <div className="space-y-1.5">
                        {editedResult.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{item.name}</span>
                            <span className="text-foreground font-medium">{formatCurrency(item.price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {editedResult.notes && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-muted-foreground">{editedResult.notes}</p>
                    </div>
                  )}
                </GlassCard>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={handleReset} disabled={scanState === "saving"}>
                  <X className="w-4 h-4 mr-2" /> Batal
                </Button>
                <Button onClick={handleConfirm} isLoading={scanState === "saving"}>
                  <Check className="w-4 h-4 mr-2" /> Simpan Transaksi
                </Button>
              </div>
            </motion.div>
          )}

          {scanState === "saved" && (
            <motion.div
              key="saved"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <GlassCard>
                <div className="flex flex-col items-center justify-center py-16 gap-6">
                  <div className="w-20 h-20 rounded-full bg-success/20 border border-success/30 flex items-center justify-center">
                    <Check className="w-10 h-10 text-success" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-foreground mb-1">Transaksi Tersimpan!</h3>
                    <p className="text-muted-foreground text-sm">Data struk berhasil dicatat sebagai transaksi.</p>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleReset}>
                      <ScanLine className="w-4 h-4 mr-2" /> Scan Lagi
                    </Button>
                    <Button variant="outline" onClick={() => window.location.href = `${import.meta.env.BASE_URL}transactions`}>
                      <ArrowRight className="w-4 h-4 mr-2" /> Lihat Transaksi
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {scanState === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <GlassCard>
                <div className="flex flex-col items-center justify-center py-16 gap-6">
                  <div className="w-20 h-20 rounded-full bg-destructive/20 border border-destructive/30 flex items-center justify-center">
                    <X className="w-10 h-10 text-destructive" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-foreground mb-1">Gagal Memproses</h3>
                    <p className="text-muted-foreground text-sm">{error || "Terjadi kesalahan saat memproses struk."}</p>
                  </div>
                  <Button onClick={handleReset}>Coba Lagi</Button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
