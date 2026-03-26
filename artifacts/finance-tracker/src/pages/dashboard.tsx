import * as React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { GlassCard } from "@/components/ui/glass-card";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  useGetMonthlySummary,
  useGetMonthlyTrend,
  useGetTransactions,
} from "@workspace/api-client-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Target,
  ArrowUpRight,
  ArrowDownLeft,
  Activity
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const currentMonth = format(new Date(), "yyyy-MM");
  
  const { data: summary, isLoading: isLoadingSummary } = useGetMonthlySummary({ month: currentMonth });
  const { data: trend, isLoading: isLoadingTrend } = useGetMonthlyTrend({ months: 6 });
  const { data: recent, isLoading: isLoadingRecent } = useGetTransactions({ limit: 5 });

  const kpis = [
    {
      title: "Net Savings",
      value: summary?.netSavings || 0,
      icon: Wallet,
      color: "text-primary",
      bg: "bg-primary/20",
    },
    {
      title: "Monthly Income",
      value: summary?.totalIncome || 0,
      icon: TrendingUp,
      color: "text-success",
      bg: "bg-success/20",
    },
    {
      title: "Monthly Expenses",
      value: summary?.totalExpenses || 0,
      icon: TrendingDown,
      color: "text-destructive",
      bg: "bg-destructive/20",
    },
    {
      title: "Savings Rate",
      value: `${summary?.savingsRate || 0}%`,
      icon: Target,
      color: "text-accent",
      bg: "bg-accent/20",
      isPercent: true
    }
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">Here's your financial snapshot for {format(new Date(), "MMMM yyyy")}.</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((kpi, i) => (
            <GlassCard key={i} delay={i * 0.1} className="relative overflow-hidden group">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110`} />
              <div className="flex flex-col gap-4 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${kpi.bg}`}>
                  <kpi.icon className={`w-7 h-7 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <h3 className="text-2xl font-bold mt-1 text-foreground">
                    {kpi.isPercent ? kpi.value : formatCurrency(kpi.value as number)}
                  </h3>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <GlassCard delay={0.4} className="lg:col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Cash Flow Trend
              </h3>
            </div>
            <div className="h-[300px] w-full">
              {isLoadingTrend ? (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground animate-pulse">Loading chart...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="income" stroke="hsl(var(--success))" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </GlassCard>

          {/* Spending Donut */}
          <GlassCard delay={0.5} className="flex flex-col">
            <h3 className="text-lg font-bold mb-6">Top Spending</h3>
            <div className="h-[200px] w-full relative">
              {isLoadingSummary ? (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary?.topCategories || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="amount"
                      stroke="none"
                    >
                      {summary?.topCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.categoryColor || `hsl(var(--primary))`} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                        fontSize: '13px',
                        padding: '8px 12px',
                      }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                      formatter={(val: number, name: string) => [formatCurrency(val), name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-4 space-y-3 flex-1 overflow-y-auto pr-2">
              {summary?.topCategories.map(cat => (
                <div key={cat.categoryId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.categoryColor }}></span>
                    <span className="text-muted-foreground">{cat.categoryIcon} {cat.categoryName}</span>
                  </div>
                  <span className="font-semibold text-foreground">{formatCurrency(cat.amount)}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Recent Transactions */}
        <GlassCard delay={0.6}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Recent Transactions</h3>
            <Badge variant="outline" className="cursor-pointer hover:bg-white/5 transition-colors">View All</Badge>
          </div>
          <div className="space-y-4">
            {isLoadingRecent ? (
              <div className="animate-pulse flex flex-col gap-4">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl"></div>)}
              </div>
            ) : recent?.transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No recent transactions.</div>
            ) : (
              recent?.transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 group">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner",
                      tx.type === 'income' ? "bg-success/10 text-success" : 
                      tx.type === 'expense' ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                    )}>
                      {tx.type === 'income' ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{tx.description}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span>
                        {tx.categoryName && (
                          <Badge variant="glass" className="text-[10px] py-0">{tx.categoryIcon} {tx.categoryName}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "text-lg font-bold",
                    tx.type === 'income' ? "text-success" : tx.type === 'expense' ? "text-foreground" : "text-primary"
                  )}>
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatCurrency(tx.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </AppLayout>
  );
}
