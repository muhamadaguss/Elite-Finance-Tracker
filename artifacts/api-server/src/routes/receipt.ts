import { Router, type IRouter } from "express";
import multer from "multer";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, transactionsTable, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/receipt/scan", upload.single("receipt"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const base64Image = req.file.buffer.toString("base64");
  const mimeType = req.file.mimetype || "image/jpeg";

  const categories = await db.select().from(categoriesTable);
  const categoryList = categories.map((c) => `${c.id}: ${c.name}`).join(", ");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_completion_tokens: 2048,
    messages: [
      {
        role: "system",
        content: `You are a receipt/financial document analyzer. Extract transaction information from the image.
Return a JSON object with these fields:
- "date": transaction date in YYYY-MM-DD format (use today's date if not visible)
- "description": merchant name or transaction description
- "amount": total amount as a number (without currency symbols). If in IDR (Indonesian Rupiah), keep the full amount without dividing.
- "type": "income" if this is a payment received/salary/transfer in, or "expense" if this is a purchase/payment/bill
- "categoryId": best matching category ID from this list: ${categoryList}
- "items": array of line items [{name, price}] if visible
- "notes": any additional relevant info from the receipt
- "confidence": your confidence level "high", "medium", or "low"

Respond ONLY with valid JSON, no markdown or explanation.`,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
          {
            type: "text",
            text: "Analyze this receipt/financial document and extract the transaction details.",
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content || "";

  let parsed;
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return res.status(422).json({ error: "Failed to parse AI response", raw: content });
  }

  const categoryInfo = categories.find((c) => c.id === parsed.categoryId);

  res.json({
    ...parsed,
    categoryName: categoryInfo?.name || null,
    categoryIcon: categoryInfo?.icon || null,
    categoryColor: categoryInfo?.color || null,
  });
});

router.post("/receipt/confirm", async (req, res) => {
  const { date, description, amount, type, categoryId, notes } = req.body;

  if (!date || !description || !amount || !type) {
    return res.status(400).json({ error: "Missing required fields: date, description, amount, type" });
  }

  const [created] = await db
    .insert(transactionsTable)
    .values({
      date,
      description,
      amount: String(amount),
      type,
      categoryId: categoryId || null,
      notes: notes || null,
      tags: ["receipt-scan"],
    })
    .returning();

  let categoryName = null,
    categoryColor = null,
    categoryIcon = null;
  if (created.categoryId) {
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, created.categoryId));
    if (cat) {
      categoryName = cat.name;
      categoryColor = cat.color;
      categoryIcon = cat.icon;
    }
  }

  res.status(201).json({ ...created, amount: parseFloat(created.amount), categoryName, categoryColor, categoryIcon });
});

export default router;
