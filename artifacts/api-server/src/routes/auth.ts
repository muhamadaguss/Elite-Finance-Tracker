import crypto from "crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  clearSession,
  getSessionId,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth";

const router: IRouter = Router();

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

const DEFAULT_CATEGORIES = [
  { name: "Makanan & Minuman", icon: "🍔", color: "#f97316" },
  { name: "Transportasi", icon: "🚗", color: "#3b82f6" },
  { name: "Belanja", icon: "🛍️", color: "#ec4899" },
  { name: "Tagihan", icon: "📄", color: "#ef4444" },
  { name: "Hiburan", icon: "🎬", color: "#8b5cf6" },
  { name: "Kesehatan", icon: "🏥", color: "#10b981" },
  { name: "Pendidikan", icon: "📚", color: "#6366f1" },
  { name: "Gaji", icon: "💰", color: "#22c55e" },
  { name: "Investasi", icon: "📈", color: "#14b8a6" },
  { name: "Lainnya", icon: "📦", color: "#64748b" },
];

async function seedDefaultCategories(userId: string) {
  const existing = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(eq(categoriesTable.userId, userId))
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(categoriesTable).values(
    DEFAULT_CATEGORIES.map((cat) => ({ ...cat, userId })),
  );
}

router.get("/auth/user", (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
      },
    });
  } else {
    res.json({ user: null });
  }
});

router.post("/auth/register", async (req: Request, res: Response) => {
  const { username, password, firstName, lastName } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Username dan password wajib diisi" });
    return;
  }

  if (typeof username !== "string" || username.length < 3) {
    res.status(400).json({ error: "Username minimal 3 karakter" });
    return;
  }

  if (typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "Password minimal 6 karakter" });
    return;
  }

  if (firstName !== undefined && typeof firstName !== "string") {
    res.status(400).json({ error: "Format nama tidak valid" });
    return;
  }

  if (lastName !== undefined && typeof lastName !== "string") {
    res.status(400).json({ error: "Format nama tidak valid" });
    return;
  }

  const salt = generateSalt();
  const passwordHash = `${salt}:${hashPassword(password, salt)}`;

  let user;
  try {
    const [inserted] = await db
      .insert(usersTable)
      .values({
        username: username.toLowerCase().trim(),
        passwordHash,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
      })
      .returning();
    user = inserted;
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Username sudah digunakan" });
      return;
    }
    throw err;
  }

  await seedDefaultCategories(user.id);

  const sessionData: SessionData = {
    user: {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);

  res.status(201).json({
    user: {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  });
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password || typeof username !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Username dan password wajib diisi" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username.toLowerCase().trim()));

  if (!user) {
    res.status(401).json({ error: "Username atau password salah" });
    return;
  }

  const [salt, storedHash] = user.passwordHash.split(":");
  const inputHash = hashPassword(password, salt);

  const storedBuf = Buffer.from(storedHash, "hex");
  const inputBuf = Buffer.from(inputHash, "hex");
  if (storedBuf.length !== inputBuf.length || !crypto.timingSafeEqual(storedBuf, inputBuf)) {
    res.status(401).json({ error: "Username atau password salah" });
    return;
  }

  await seedDefaultCategories(user.id);

  const sessionData: SessionData = {
    user: {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);

  res.json({
    user: {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  });
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ success: true });
});

export default router;
