import { Router, type IRouter } from "express";
import { db, transactionsTable, categoriesTable } from "@workspace/db";
import { eq, and, sql, ilike, desc, count } from "drizzle-orm";
import { z } from "zod";
import {
  GetTransactionsQueryParams,
  GetTransactionParams,
  UpdateTransactionParams,
  DeleteTransactionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Hand-crafted schemas that accept date strings (Orval generates zod.date() which
// requires a JS Date object — but HTTP JSON bodies always send dates as strings).
const createTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(["income", "expense", "transfer"]),
  categoryId: z.number().nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().nullable().optional(),
});

const updateTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  type: z.enum(["income", "expense", "transfer"]).optional(),
  categoryId: z.number().nullable().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
});

async function getCategoryInfo(categoryId: number | null | undefined) {
  if (!categoryId) return { categoryName: null, categoryColor: null, categoryIcon: null };
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, categoryId));
  return {
    categoryName: cat?.name ?? null,
    categoryColor: cat?.color ?? null,
    categoryIcon: cat?.icon ?? null,
  };
}

// READ - list
router.get("/transactions", async (req, res) => {
  const query = GetTransactionsQueryParams.parse(req.query);
  const { month, categoryId, type, search, limit = 50, offset = 0 } = query;

  const conditions: ReturnType<typeof eq>[] = [];
  if (month) conditions.push(sql`to_char(${transactionsTable.date}, 'YYYY-MM') = ${month}`);
  if (categoryId != null) conditions.push(eq(transactionsTable.categoryId, categoryId));
  if (type) conditions.push(eq(transactionsTable.type, type as "income" | "expense" | "transfer"));
  if (search) conditions.push(ilike(transactionsTable.description, `%${search}%`));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: transactionsTable.id,
        date: transactionsTable.date,
        description: transactionsTable.description,
        amount: transactionsTable.amount,
        type: transactionsTable.type,
        categoryId: transactionsTable.categoryId,
        tags: transactionsTable.tags,
        notes: transactionsTable.notes,
        createdAt: transactionsTable.createdAt,
        categoryName: categoriesTable.name,
        categoryColor: categoriesTable.color,
        categoryIcon: categoriesTable.icon,
      })
      .from(transactionsTable)
      .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
      .where(whereClause)
      .orderBy(desc(transactionsTable.date), desc(transactionsTable.createdAt))
      .limit(limit ?? 50)
      .offset(offset ?? 0),
    db
      .select({
        total: count(),
        totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'income' THEN ${transactionsTable.amount}::numeric ELSE 0 END), 0)`,
        totalExpenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'expense' THEN ${transactionsTable.amount}::numeric ELSE 0 END), 0)`,
      })
      .from(transactionsTable)
      .where(whereClause),
  ]);

  res.json({
    transactions: rows.map((r) => ({ ...r, amount: parseFloat(r.amount) })),
    total: totals[0]?.total ?? 0,
    totalIncome: parseFloat(String(totals[0]?.totalIncome ?? 0)),
    totalExpenses: parseFloat(String(totals[0]?.totalExpenses ?? 0)),
  });
});

// CREATE
router.post("/transactions", async (req, res) => {
  const result = createTransactionSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0]?.message ?? "Validation error" });
  }
  const body = result.data;

  const [created] = await db
    .insert(transactionsTable)
    .values({ ...body, amount: String(body.amount), tags: body.tags ?? [] })
    .returning();

  const catInfo = await getCategoryInfo(created.categoryId);
  res.status(201).json({ ...created, amount: parseFloat(created.amount), ...catInfo });
});

// READ - single
router.get("/transactions/:id", async (req, res) => {
  const { id } = GetTransactionParams.parse(req.params);
  const [row] = await db
    .select({
      id: transactionsTable.id,
      date: transactionsTable.date,
      description: transactionsTable.description,
      amount: transactionsTable.amount,
      type: transactionsTable.type,
      categoryId: transactionsTable.categoryId,
      tags: transactionsTable.tags,
      notes: transactionsTable.notes,
      createdAt: transactionsTable.createdAt,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      categoryIcon: categoriesTable.icon,
    })
    .from(transactionsTable)
    .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
    .where(eq(transactionsTable.id, id));

  if (!row) return res.status(404).json({ error: "Transaction not found" });
  res.json({ ...row, amount: parseFloat(row.amount) });
});

// UPDATE
router.patch("/transactions/:id", async (req, res) => {
  const { id } = UpdateTransactionParams.parse(req.params);

  const result = updateTransactionSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0]?.message ?? "Validation error" });
  }
  const body = result.data;

  const updateData: Record<string, unknown> = {};
  if (body.date !== undefined) updateData.date = body.date;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.amount !== undefined) updateData.amount = String(body.amount);
  if (body.type !== undefined) updateData.type = body.type;
  if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
  if (body.tags !== undefined) updateData.tags = body.tags;
  if (body.notes !== undefined) updateData.notes = body.notes;

  const [updated] = await db
    .update(transactionsTable)
    .set(updateData)
    .where(eq(transactionsTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Transaction not found" });

  const catInfo = await getCategoryInfo(updated.categoryId);
  res.json({ ...updated, amount: parseFloat(updated.amount), ...catInfo });
});

// DELETE
router.delete("/transactions/:id", async (req, res) => {
  const { id } = DeleteTransactionParams.parse(req.params);
  const [deleted] = await db.delete(transactionsTable).where(eq(transactionsTable.id, id)).returning();
  if (!deleted) return res.status(404).json({ error: "Transaction not found" });
  res.status(204).send();
});

export default router;
