import * as React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Plus, Edit2, Trash2, LayoutGrid } from "lucide-react";
import { 
  useGetCategories, 
  useCreateCategory, 
  useUpdateCategory, 
  useDeleteCategory,
  getGetCategoriesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Categories() {
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useGetCategories();
  
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);

  const [formData, setFormData] = React.useState({
    name: "",
    icon: "🏷️",
    color: "#3b82f6",
    parentId: null as number | null
  });

  const handleOpenModal = (cat?: any) => {
    if (cat) {
      setEditingId(cat.id);
      setFormData({
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        parentId: cat.parentId,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        icon: "🏷️",
        color: "#3b82f6",
        parentId: null
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateCat.mutateAsync({ id: editingId, data: formData });
      } else {
        await createCat.mutateAsync({ data: formData });
      }
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: getGetCategoriesQueryKey() });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this category? Transactions may lose their category link.")) {
      await deleteCat.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getGetCategoriesQueryKey() });
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Categories</h1>
            <p className="text-muted-foreground mt-1">Organize your spending with custom categories.</p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" /> New Category
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5].map(i => <GlassCard key={i} className="h-32 animate-pulse bg-white/5" />)}
          </div>
        ) : categories?.length === 0 ? (
          <GlassCard className="text-center py-16">
            <LayoutGrid className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No categories yet</h3>
            <p className="text-muted-foreground mb-6">Create your first category to start organizing transactions.</p>
            <Button onClick={() => handleOpenModal()}>Create Category</Button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories?.map((cat, i) => (
              <GlassCard key={cat.id} delay={i * 0.05} className="group flex flex-col justify-between hover:border-white/20 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-white/10" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                      {cat.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">{cat.name}</h3>
                      <p className="text-sm text-muted-foreground">{cat.transactionCount} transactions</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenModal(cat)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {cat.parentName && (
                  <div className="mt-4 pt-4 border-t border-white/5 text-xs text-muted-foreground">
                    Parent: <span className="font-medium text-foreground">{cat.parentName}</span>
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Category" : "New Category"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Name</label>
            <Input 
              placeholder="e.g. Groceries" 
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Icon (Emoji)</label>
              <Input 
                placeholder="🛒" 
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Parent Category (Optional)</label>
            <select 
              className="flex h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={formData.parentId || ""}
              onChange={(e) => setFormData({...formData, parentId: e.target.value ? parseInt(e.target.value) : null})}
            >
              <option value="">None</option>
              {categories?.filter(c => c.id !== editingId).map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createCat.isPending || updateCat.isPending}>Save Category</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
