import * as React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { GlassCard } from "@/components/ui/glass-card";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import {
  useGetMonthlySummary,
  useGetMonthlyTrend,
} from "@workspace/api-client-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  LineChart,
  Line
} from "recharts";
import { TrendingUp, Target } from "lucide-react";

export default function Analytics() {
  const currentMonth = format(new Date(), "yyyy-MM");
  
  const { data: summary, isLoading: isLoadingSummary } = useGetMonthlySummary({ month: currentMonth });
  const { data: trend, isLoading: isLoadingTrend } = useGetMonthlyTrend({ months: 12 });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics & Insights</h1>
          <p className="text-muted-foreground mt-1">Deep dive into your financial habits and trends.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard delay={0.1}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/20 text-primary">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">Savings Rate</h3>
            </div>
            <div className="mt-4 flex items-end gap-4">
              <span className="text-5xl font-black text-foreground">{summary?.savingsRate || 0}%</span>
              <span className="text-muted-foreground mb-1">this month</span>
            </div>
            <div className="w-full bg-muted h-3 rounded-full mt-6 overflow-hidden border border-border/30">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(0, summary?.savingsRate || 0))}%` }}
              />
            </div>
          </GlassCard>

          <GlassCard delay={0.2}>
             <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-success/20 text-success">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">Net Savings</h3>
            </div>
            <div className="mt-4 flex items-end gap-4">
              <span className="text-5xl font-black text-foreground">{formatCurrency(summary?.netSavings || 0)}</span>
              <span className="text-muted-foreground mb-1">this month</span>
            </div>
            <div className="flex justify-between mt-6 pt-4 border-t border-border/30">
              <div className="text-success text-sm">+ {formatCurrency(summary?.totalIncome || 0)} In</div>
              <div className="text-destructive text-sm">- {formatCurrency(summary?.totalExpenses || 0)} Out</div>
            </div>
          </GlassCard>
        </div>

        <GlassCard delay={0.3} className="h-[400px]">
          <h3 className="text-lg font-bold mb-6">12 Month Income vs Expense</h3>
          {isLoadingTrend ? (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 1_000_000 ? `Rp${(val/1_000_000).toFixed(1)}jt` : val >= 1_000 ? `Rp${(val/1_000).toFixed(0)}rb` : `Rp${val}`} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                  formatter={(val: number) => [formatCurrency(val), ""]}
                />
                <Legend iconType="circle" />
                <Bar dataKey="income" name="Income" fill="hsl(var(--success))" radius={[4,4,0,0]} barSize={30} />
                <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--destructive))" radius={[4,4,0,0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        <GlassCard delay={0.4} className="h-[400px]">
          <h3 className="text-lg font-bold mb-6">Savings Growth</h3>
          {isLoadingTrend ? (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 1_000_000 ? `Rp${(val/1_000_000).toFixed(1)}jt` : val >= 1_000 ? `Rp${(val/1_000).toFixed(0)}rb` : `Rp${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                  formatter={(val: number) => [formatCurrency(val), ""]}
                />
                <Line type="monotone" dataKey="savings" name="Net Savings" stroke="hsl(var(--primary))" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--card))' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </GlassCard>
      </div>
    </AppLayout>
  );
}
