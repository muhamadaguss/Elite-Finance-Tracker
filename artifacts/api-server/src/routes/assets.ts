import { Router, type IRouter } from "express";
import { db, assetsTable, assetHistoryTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { CreateAssetBody, UpdateAssetBody, UpdateAssetParams, DeleteAssetParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/assets", async (_req, res) => {
  const assets = await db.select().from(assetsTable).orderBy(desc(assetsTable.updatedAt));
  res.json(
    assets.map((a) => ({
      ...a,
      currentValue: parseFloat(a.currentValue),
    }))
  );
});

router.post("/assets", async (req, res) => {
  const body = CreateAssetBody.parse(req.body);
  const [created] = await db
    .insert(assetsTable)
    .values({ ...body, currentValue: String(body.currentValue) })
    .returning();

  await db.insert(assetHistoryTable).values({
    assetId: created.id,
    value: created.currentValue,
  });

  res.status(201).json({ ...created, currentValue: parseFloat(created.currentValue) });
});

router.patch("/assets/:id", async (req, res) => {
  const { id } = UpdateAssetParams.parse(req.params);
  const body = UpdateAssetBody.parse(req.body);
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updateData.name = body.name;
  if (body.currentValue !== undefined) updateData.currentValue = String(body.currentValue);
  if (body.color !== undefined) updateData.color = body.color;
  if (body.icon !== undefined) updateData.icon = body.icon;

  const [updated] = await db
    .update(assetsTable)
    .set(updateData)
    .where(eq(assetsTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Asset not found" });

  if (body.currentValue !== undefined) {
    await db.insert(assetHistoryTable).values({
      assetId: updated.id,
      value: updated.currentValue,
    });
  }

  res.json({ ...updated, currentValue: parseFloat(updated.currentValue) });
});

router.delete("/assets/:id", async (req, res) => {
  const { id } = DeleteAssetParams.parse(req.params);
  await db.delete(assetsTable).where(eq(assetsTable.id, id));
  res.status(204).send();
});

router.get("/assets/net-worth-history", async (_req, res) => {
  const rows = await db
    .select({
      date: sql<string>`to_char(${assetHistoryTable.recordedAt}, 'YYYY-MM-DD')`,
      assetId: assetHistoryTable.assetId,
      value: assetHistoryTable.value,
      assetName: assetsTable.name,
    })
    .from(assetHistoryTable)
    .leftJoin(assetsTable, eq(assetHistoryTable.assetId, assetsTable.id))
    .orderBy(sql`to_char(${assetHistoryTable.recordedAt}, 'YYYY-MM-DD') ASC`);

  const byDate = new Map<string, { netWorth: number; breakdown: Record<string, number> }>();
  for (const row of rows) {
    if (!byDate.has(row.date)) {
      byDate.set(row.date, { netWorth: 0, breakdown: {} });
    }
    const entry = byDate.get(row.date)!;
    const val = parseFloat(String(row.value));
    entry.netWorth += val;
    entry.breakdown[row.assetName ?? `Asset ${row.assetId}`] = val;
  }

  if (byDate.size === 0) {
    const assets = await db.select().from(assetsTable);
    if (assets.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const netWorth = assets.reduce((sum, a) => sum + parseFloat(a.currentValue), 0);
      const breakdown: Record<string, number> = {};
      for (const a of assets) breakdown[a.name] = parseFloat(a.currentValue);
      byDate.set(today, { netWorth, breakdown });
    }
  }

  const result = Array.from(byDate.entries()).map(([date, data]) => ({
    date,
    netWorth: data.netWorth,
    breakdown: data.breakdown,
  }));

  res.json(result);
});

export default router;
