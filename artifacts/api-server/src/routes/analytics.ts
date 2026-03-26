import { Router, type IRouter } from "express";
import { db, transactionsTable, categoriesTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { GetMonthlySummaryQueryParams, GetSpendingByCategoryQueryParams, GetMonthlyTrendQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/analytics/monthly-summary", async (req, res) => {
  const { month } = GetMonthlySummaryQueryParams.parse(req.query);
  const userId = req.user!.id;

  const [summary] = await db
    .select({
      totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'income' THEN ${transactionsTable.amount}::numeric ELSE 0 END), 0)`,
      totalExpenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'expense' THEN ${transactionsTable.amount}::numeric ELSE 0 END), 0)`,
      transactionCount: sql<number>`CAST(COUNT(*) AS INTEGER)`,
    })
    .from(transactionsTable)
    .where(and(sql`to_char(${transactionsTable.date}, 'YYYY-MM') = ${month}`, eq(transactionsTable.userId, userId)));

  const totalIncome = parseFloat(String(summary?.totalIncome ?? 0));
  const totalExpenses = parseFloat(String(summary?.totalExpenses ?? 0));
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  const topCategories = await db
    .select({
      categoryId: categoriesTable.id,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      categoryIcon: categoriesTable.icon,
      amount: sql<number>`COALESCE(SUM(${transactionsTable.amount}::numeric), 0)`,
      transactionCount: sql<number>`CAST(COUNT(${transactionsTable.id}) AS INTEGER)`,
    })
    .from(transactionsTable)
    .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
    .where(
      and(
        eq(transactionsTable.userId, userId),
        sql`to_char(${transactionsTable.date}, 'YYYY-MM') = ${month}`,
        sql`${transactionsTable.type} = 'expense'`
      )
    )
    .groupBy(categoriesTable.id, categoriesTable.name, categoriesTable.color, categoriesTable.icon)
    .orderBy(sql`SUM(${transactionsTable.amount}::numeric) DESC`)
    .limit(5);

  res.json({
    month,
    totalIncome,
    totalExpenses,
    netSavings,
    savingsRate: Math.round(savingsRate * 10) / 10,
    transactionCount: summary?.transactionCount ?? 0,
    topCategories: topCategories.map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName ?? "Uncategorized",
      categoryColor: c.categoryColor ?? "#6366f1",
      categoryIcon: c.categoryIcon ?? "💰",
      amount: parseFloat(String(c.amount)),
      percentage: totalExpenses > 0 ? Math.round((parseFloat(String(c.amount)) / totalExpenses) * 1000) / 10 : 0,
      transactionCount: c.transactionCount,
    })),
  });
});

router.get("/analytics/spending-by-category", async (req, res) => {
  const { month } = GetSpendingByCategoryQueryParams.parse(req.query);
  const userId = req.user!.id;

  const rows = await db
    .select({
      categoryId: categoriesTable.id,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      categoryIcon: categoriesTable.icon,
      amount: sql<number>`COALESCE(SUM(${transactionsTable.amount}::numeric), 0)`,
      transactionCount: sql<number>`CAST(COUNT(${transactionsTable.id}) AS INTEGER)`,
    })
    .from(transactionsTable)
    .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
    .where(
      and(
        eq(transactionsTable.userId, userId),
        sql`to_char(${transactionsTable.date}, 'YYYY-MM') = ${month}`,
        sql`${transactionsTable.type} = 'expense'`
      )
    )
    .groupBy(categoriesTable.id, categoriesTable.name, categoriesTable.color, categoriesTable.icon)
    .orderBy(sql`SUM(${transactionsTable.amount}::numeric) DESC`);

  const totalExpenses = rows.reduce((sum, r) => sum + parseFloat(String(r.amount)), 0);

  res.json(
    rows.map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName ?? "Uncategorized",
      categoryColor: c.categoryColor ?? "#6366f1",
      categoryIcon: c.categoryIcon ?? "💰",
      amount: parseFloat(String(c.amount)),
      percentage: totalExpenses > 0 ? Math.round((parseFloat(String(c.amount)) / totalExpenses) * 1000) / 10 : 0,
      transactionCount: c.transactionCount,
    }))
  );
});

router.get("/analytics/monthly-trend", async (req, res) => {
  const { months: monthsParam } = GetMonthlyTrendQueryParams.parse(req.query);
  const months = monthsParam ?? 12;
  const userId = req.user!.id;

  const rows = await db
    .select({
      month: sql<string>`to_char(${transactionsTable.date}, 'YYYY-MM')`,
      income: sql<number>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'income' THEN ${transactionsTable.amount}::numeric ELSE 0 END), 0)`,
      expenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'expense' THEN ${transactionsTable.amount}::numeric ELSE 0 END), 0)`,
    })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), sql`${transactionsTable.date} >= NOW() - INTERVAL '${sql.raw(String(months))} months'`))
    .groupBy(sql`to_char(${transactionsTable.date}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${transactionsTable.date}, 'YYYY-MM') ASC`);

  res.json(
    rows.map((r) => ({
      month: r.month,
      income: parseFloat(String(r.income)),
      expenses: parseFloat(String(r.expenses)),
      savings: parseFloat(String(r.income)) - parseFloat(String(r.expenses)),
    }))
  );
});

export default router;
