import { Router, type IRouter } from "express";
import { db, categoriesTable, transactionsTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import {
  CreateCategoryBody,
  UpdateCategoryBody,
  UpdateCategoryParams,
  DeleteCategoryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/categories", async (req, res) => {
  const userId = req.user!.id;
  const cats = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      icon: categoriesTable.icon,
      color: categoriesTable.color,
      parentId: categoriesTable.parentId,
      transactionCount: sql<number>`CAST(COUNT(${transactionsTable.id}) AS INTEGER)`,
    })
    .from(categoriesTable)
    .leftJoin(transactionsTable, and(eq(transactionsTable.categoryId, categoriesTable.id), eq(transactionsTable.userId, userId)))
    .where(eq(categoriesTable.userId, userId))
    .groupBy(categoriesTable.id);

  const catMap = new Map(cats.map((c) => [c.id, c.name]));

  res.json(
    cats.map((c) => ({
      ...c,
      parentName: c.parentId ? (catMap.get(c.parentId) ?? null) : null,
    }))
  );
});

router.post("/categories", async (req, res) => {
  const body = CreateCategoryBody.parse(req.body);
  const userId = req.user!.id;
  const [created] = await db.insert(categoriesTable).values({ ...body, userId }).returning();
  res.status(201).json({ ...created, transactionCount: 0, parentName: null });
});

router.patch("/categories/:id", async (req, res) => {
  const { id } = UpdateCategoryParams.parse(req.params);
  const userId = req.user!.id;
  const body = UpdateCategoryBody.parse(req.body);
  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.icon !== undefined) updateData.icon = body.icon;
  if (body.color !== undefined) updateData.color = body.color;
  if (body.parentId !== undefined) updateData.parentId = body.parentId;

  const [updated] = await db
    .update(categoriesTable)
    .set(updateData)
    .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)))
    .returning();

  if (!updated) return res.status(404).json({ error: "Category not found" });
  res.json({ ...updated, transactionCount: 0, parentName: null });
});

router.delete("/categories/:id", async (req, res) => {
  const { id } = DeleteCategoryParams.parse(req.params);
  const userId = req.user!.id;
  await db.delete(categoriesTable).where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)));
  res.status(204).send();
});

export default router;
