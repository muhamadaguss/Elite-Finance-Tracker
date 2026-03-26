import * as React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useParseImport, useConfirmImport, getGetTransactionsQueryKey, getGetMonthlySummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

export default function Import() {
  const [content, setContent] = React.useState("");
  const parseMutation = useParseImport();
  const confirmMutation = useConfirmImport();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleParse = () => {
    if (!content.trim()) return;
    parseMutation.mutate({
      data: { content, format: "auto" }
    });
  };

  const handleConfirm = async () => {
    if (!parseMutation.data?.transactions) return;
    
    try {
      await confirmMutation.mutateAsync({
        data: {
          transactions: parseMutation.data.transactions.map(tx => ({
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            categoryId: tx.suggestedCategoryId
          }))
        }
      });
      
      queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMonthlySummaryQueryKey() });
      
      alert(`Successfully imported ${confirmMutation.data?.imported || parseMutation.data.transactions.length} transactions`);
      setLocation("/transactions");
    } catch (err) {
      console.error(err);
      alert("Failed to import transactions");
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Import Data</h1>
          <p className="text-muted-foreground mt-1">Paste CSV or plain text from your bank to auto-categorize and save.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <GlassCard className="flex flex-col gap-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Input Data
            </h2>
            <textarea
              className="w-full h-[400px] bg-black/20 border border-white/10 rounded-xl p-4 text-sm font-mono text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
              placeholder="Date,Description,Amount&#10;2024-01-15,Uber Eats,-120.50&#10;2024-01-16,Salary,4500.00"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <Button 
              onClick={handleParse} 
              disabled={!content.trim() || parseMutation.isPending}
              isLoading={parseMutation.isPending}
              className="w-full"
            >
              Analyze & Parse Data
            </Button>
          </GlassCard>

          <GlassCard className="flex flex-col gap-4">
            <h2 className="text-lg font-bold">Preview & Confirm</h2>
            
            {!parseMutation.data && !parseMutation.isPending && (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-white/5 rounded-xl p-8 text-center">
                <CheckCircle2 className="w-12 h-12 mb-4 opacity-50" />
                <p>Paste data and click Analyze to see preview here.</p>
              </div>
            )}

            {parseMutation.data && (
              <>
                <div className="flex items-center gap-4 bg-primary/10 border border-primary/20 p-4 rounded-xl text-primary font-medium">
                  Found {parseMutation.data.totalFound} valid transactions
                </div>
                
                {parseMutation.data.parseErrors.length > 0 && (
                  <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl text-destructive text-sm flex flex-col gap-1">
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <AlertCircle className="w-4 h-4" /> Errors occurred:
                    </div>
                    {parseMutation.data.parseErrors.map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                  </div>
                )}

                <div className="flex-1 overflow-auto border border-white/5 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Description</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {parseMutation.data.transactions.map((tx, i) => (
                        <tr key={i} className="hover:bg-white/5">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(tx.date)}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{tx.description}</div>
                            {tx.suggestedCategoryName && (
                              <div className="text-xs text-primary mt-1">Suggested: {tx.suggestedCategoryName}</div>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${tx.type === 'income' ? 'text-success' : 'text-foreground'}`}>
                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button 
                  onClick={handleConfirm}
                  isLoading={confirmMutation.isPending}
                  disabled={parseMutation.data.transactions.length === 0}
                  className="w-full bg-success hover:bg-success/80 text-success-foreground"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm & Import All
                </Button>
              </>
            )}
          </GlassCard>
        </div>
      </div>
    </AppLayout>
  );
}
