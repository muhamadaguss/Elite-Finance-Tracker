import * as React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/utils";
import { Plus, Edit2, Trash2, Landmark } from "lucide-react";
import { 
  useGetAssets, 
  useCreateAsset, 
  useUpdateAsset, 
  useDeleteAsset,
  useGetNetWorthHistory,
  getGetAssetsQueryKey,
  getGetNetWorthHistoryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AssetType, CreateAssetInput } from "@workspace/api-client-react";

export default function Assets() {
  const queryClient = useQueryClient();
  const { data: assets, isLoading } = useGetAssets();
  const { data: history } = useGetNetWorthHistory();
  
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);

  const [formData, setFormData] = React.useState<CreateAssetInput>({
    name: "",
    type: "cash",
    currentValue: 0,
    currency: "IDR",
    color: "#3b82f6",
    icon: "💵"
  });

  const handleOpenModal = (asset?: any) => {
    if (asset) {
      setEditingId(asset.id);
      setFormData({
        name: asset.name,
        type: asset.type,
        currentValue: asset.currentValue,
        currency: asset.currency,
        color: asset.color,
        icon: asset.icon,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        type: "cash",
        currentValue: 0,
        currency: "USD",
        color: "#3b82f6",
        icon: "💵"
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateAsset.mutateAsync({ id: editingId, data: formData });
      } else {
        await createAsset.mutateAsync({ data: formData });
      }
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: getGetAssetsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetNetWorthHistoryQueryKey() });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this asset?")) {
      await deleteAsset.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getGetAssetsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetNetWorthHistoryQueryKey() });
    }
  };

  const totalNetWorth = assets?.reduce((sum, a) => sum + a.currentValue, 0) || 0;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Asset Portfolio</h1>
            <p className="text-muted-foreground mt-1">Track your net worth and investments.</p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" /> Add Asset
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GlassCard className="col-span-1 lg:col-span-1 flex flex-col justify-center items-center text-center p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-50"></div>
            <Landmark className="w-12 h-12 text-primary mb-4 relative z-10" />
            <p className="text-lg text-muted-foreground relative z-10">Total Net Worth</p>
            <h2 className="text-4xl font-black text-foreground mt-2 relative z-10">{formatCurrency(totalNetWorth)}</h2>
          </GlassCard>

          <GlassCard className="col-span-1 lg:col-span-2 h-[200px]">
            <h3 className="text-sm font-bold text-muted-foreground mb-2">Net Worth History</h3>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history || []} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(val: number) => formatCurrency(val)}
                  labelFormatter={(val) => `Date: ${val}`}
                />
                <Area type="monotone" dataKey="netWorth" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#colorNw)" />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">Your Assets</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => <GlassCard key={i} className="h-32 animate-pulse bg-white/5" />)}
            </div>
          ) : assets?.length === 0 ? (
            <GlassCard className="text-center py-16">
              <p className="text-muted-foreground mb-4">You haven't added any assets yet.</p>
              <Button onClick={() => handleOpenModal()}>Add your first asset</Button>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assets?.map((asset, i) => (
                <GlassCard key={asset.id} delay={i * 0.1} className="group relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-border/50" style={{ backgroundColor: `${asset.color}20`, color: asset.color }}>
                        {asset.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">{asset.name}</h3>
                        <p className="text-sm text-muted-foreground uppercase tracking-wider">{asset.type}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex items-end justify-between">
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(asset.currentValue)}</div>
                    <div className="flex gap-1">
                      <button onClick={() => handleOpenModal(asset)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(asset.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Asset" : "Add Asset"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Name</label>
            <Input 
              placeholder="e.g. Chase Checking" 
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <select 
                className="flex h-12 w-full rounded-xl border border-border bg-muted/50 px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as AssetType})}
              >
                <option value="cash">Cash / Bank</option>
                <option value="investment">Investment</option>
                <option value="property">Property</option>
                <option value="crypto">Crypto</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Current Value</label>
              <Input 
                type="number" 
                step="0.01"
                required
                value={formData.currentValue}
                onChange={(e) => setFormData({...formData, currentValue: parseFloat(e.target.value)})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Icon (Emoji)</label>
              <Input 
                placeholder="🏦" 
                required
                maxLength={2}
                value={formData.icon}
                onChange={(e) => setFormData({...formData, icon: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Color (Hex)</label>
              <div className="flex gap-2">
                <Input 
                  type="color"
                  className="w-12 p-1"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                />
                <Input 
                  type="text" 
                  pattern="^#[0-9A-Fa-f]{6}$"
                  required
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createAsset.isPending || updateAsset.isPending}>Save Asset</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
