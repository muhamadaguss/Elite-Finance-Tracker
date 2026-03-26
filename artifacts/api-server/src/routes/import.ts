import { Router, type IRouter } from "express";
import { db, transactionsTable, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ParseImportBody, ConfirmImportBody } from "@workspace/api-zod";

const router: IRouter = Router();

function parseDate(raw: string): string | null {
  const cleaned = raw.trim();
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    /^(\d{2})-(\d{2})-(\d{4})$/,
    /^(\d{2})\.(\d{2})\.(\d{4})$/,
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,
  ];

  for (const fmt of formats) {
    const m = cleaned.match(fmt);
    if (m) {
      let year: string, month: string, day: string;
      if (fmt === formats[0]) {
        [, year, month, day] = m;
      } else if (fmt === formats[1] || fmt === formats[2] || fmt === formats[3]) {
        [, day, month, year] = m;
        if (year.length === 2) year = `20${year}`;
      } else {
        [, month, day, year] = m;
        if (year.length === 2) year = `20${year}`;
      }
      const d = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split("T")[0];
      }
    }
  }
  return null;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.,\-]/g, "").replace(",", ".");
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : Math.abs(val);
}

function guessType(amount: string, description: string): "income" | "expense" | "transfer" {
  const desc = description.toLowerCase();
  const rawAmount = amount.trim();
  if (rawAmount.startsWith("+") || parseFloat(rawAmount.replace(",", ".")) > 0) {
    if (desc.includes("salary") || desc.includes("deposit") || desc.includes("income") || desc.includes("credit")) {
      return "income";
    }
  }
  if (desc.includes("transfer") || desc.includes("trf") || desc.includes("wire")) return "transfer";
  const numVal = parseFloat(rawAmount.replace(",", "."));
  if (numVal > 0 && (desc.includes("salary") || desc.includes("income") || desc.includes("deposit"))) return "income";
  return "expense";
}

function parseCSV(content: string) {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return { transactions: [], errors: ["No data rows found"] };

  const errors: string[] = [];
  const transactions: {
    date: string;
    description: string;
    amount: number;
    type: "income" | "expense" | "transfer";
  }[] = [];

  const header = lines[0].split(/[,;\t]/).map((h) => h.trim().toLowerCase().replace(/["']/g, ""));
  const dateIdx = header.findIndex((h) => h.includes("date") || h.includes("datum") || h === "tanggal");
  const descIdx = header.findIndex((h) => h.includes("desc") || h.includes("memo") || h.includes("keterangan") || h.includes("narration"));
  const amountIdx = header.findIndex((h) => h.includes("amount") || h.includes("jumlah") || h.includes("debit") || h.includes("credit") || h.includes("nominal"));

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    return { transactions: [], errors: ["Could not identify required columns (date, description, amount). Found: " + header.join(", ")] };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(/[,;\t]/).map((c) => c.trim().replace(/^["']|["']$/g, ""));

    const rawDate = cols[dateIdx] ?? "";
    const rawDesc = cols[descIdx] ?? "";
    const rawAmount = cols[amountIdx] ?? "";

    const date = parseDate(rawDate);
    const amount = parseAmount(rawAmount);

    if (!date) { errors.push(`Row ${i + 1}: Invalid date "${rawDate}"`); continue; }
    if (amount === null) { errors.push(`Row ${i + 1}: Invalid amount "${rawAmount}"`); continue; }
    if (!rawDesc) { errors.push(`Row ${i + 1}: Empty description`); continue; }

    transactions.push({
      date,
      description: rawDesc,
      amount,
      type: guessType(rawAmount, rawDesc),
    });
  }

  return { transactions, errors };
}

function parsePlainText(content: string) {
  const lines = content.trim().split("\n");
  const errors: string[] = [];
  const transactions: {
    date: string;
    description: string;
    amount: number;
    type: "income" | "expense" | "transfer";
  }[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const dateMatch = line.match(/\d{4}-\d{2}-\d{2}|\d{2}[\/.\-]\d{2}[\/.\-]\d{4}/);
    const amountMatch = line.match(/[-+]?\d[\d,.]*(?:\.\d{2})?/g);
    if (!dateMatch || !amountMatch) { errors.push(`Skipping line: "${line.substring(0, 60)}"`); continue; }

    const date = parseDate(dateMatch[0]);
    const rawAmount = amountMatch[amountMatch.length - 1];
    const amount = parseAmount(rawAmount);
    const desc = line
      .replace(dateMatch[0], "")
      .replace(rawAmount, "")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 200);

    if (!date || amount === null) { errors.push(`Could not parse: "${line.substring(0, 60)}"`); continue; }

    transactions.push({
      date,
      description: desc || "Unknown",
      amount,
      type: guessType(rawAmount, desc),
    });
  }

  return { transactions, errors };
}

router.post("/import/parse", async (req, res) => {
  const body = ParseImportBody.parse(req.body);
  const { content, format } = body;
  const userId = req.user!.id;

  const isCSV = format === "csv" || (format === "auto" && (content.includes(",") || content.includes(";") || content.includes("\t")));
  const result = isCSV ? parseCSV(content) : parsePlainText(content);

  const categories = await db.select().from(categoriesTable).where(eq(categoriesTable.userId, userId));

  const enriched = result.transactions.map((t) => {
    let suggestedCategoryId = null;
    let suggestedCategoryName = null;

    const descLower = t.description.toLowerCase();
    for (const cat of categories) {
      if (descLower.includes(cat.name.toLowerCase())) {
        suggestedCategoryId = cat.id;
        suggestedCategoryName = cat.name;
        break;
      }
    }

    return { ...t, suggestedCategoryId, suggestedCategoryName };
  });

  res.json({
    transactions: enriched,
    totalFound: enriched.length,
    parseErrors: result.errors,
  });
});

router.post("/import/confirm", async (req, res) => {
  const body = ConfirmImportBody.parse(req.body);
  const userId = req.user!.id;
  let imported = 0;
  let failed = 0;

  for (const t of body.transactions) {
    try {
      await db.insert(transactionsTable).values({
        ...t,
        userId,
        amount: String(t.amount),
        tags: t.tags ?? [],
      });
      imported++;
    } catch {
      failed++;
    }
  }

  res.json({ imported, failed });
});

export default router;
