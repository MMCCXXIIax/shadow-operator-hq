import bcrypt from "bcryptjs";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
  GetSignupAvailabilityResponse,
  SignUpBody,
  LogInBody,
} from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  clearSession,
  createSession,
  deleteSession,
  getSessionId,
  setSessionCookie,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth";

const router: IRouter = Router();

// This app is a private, single-operator workspace. Sign-up is not left open to
// the public, but it is also never closed in a way that can lock the operator out:
//   - while the workspace has no accounts at all, the first account can be created
//     (bootstrap path, so a fresh deployment is usable);
//   - `ALLOWED_SIGNUP_EMAILS` (comma-separated) explicitly allows extra accounts;
//   - existing accounts can always sign in — this gate only guards creation.
const signupAllowlist = (process.env.ALLOWED_SIGNUP_EMAILS ?? "")
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

async function countUsers(): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  return row?.count ?? 0;
}

async function isSignupOpenFor(normalizedEmail: string): Promise<boolean> {
  if (signupAllowlist.length > 0) {
    return signupAllowlist.includes(normalizedEmail);
  }
  return (await countUsers()) === 0;
}

router.get("/auth/signup-availability", async (_req: Request, res: Response) => {
  const open = signupAllowlist.length > 0 || (await countUsers()) === 0;
  res.json(GetSignupAvailabilityResponse.parse({ open }));
});

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

router.post("/auth/signup", async (req: Request, res: Response) => {
  const parsed = SignUpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request. Provide fullName, email (valid), and password (8+ chars)." });
    return;
  }

  const { fullName, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  if (!(await isSignupOpenFor(normalizedEmail))) {
    res.status(403).json({
      error: "This workspace is private and is not accepting new accounts.",
    });
    return;
  }

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  if (existing) {
    res.status(409).json({ error: "An account with that email already exists." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(usersTable)
    .values({ fullName, email: normalizedEmail, passwordHash })
    .returning();

  const sessionUser = { id: user.id, fullName: user.fullName ?? null, email: user.email ?? null };
  const sessionData: SessionData = { user: sessionUser };
  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);

  res.status(201).json(GetCurrentAuthUserResponse.parse({ user: sessionUser }));
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const parsed = LogInBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Provide a valid email and password." });
    return;
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Incorrect email or password." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Incorrect email or password." });
    return;
  }

  const sessionUser = { id: user.id, fullName: user.fullName ?? null, email: user.email ?? null };
  const sessionData: SessionData = { user: sessionUser };
  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);

  res.json(GetCurrentAuthUserResponse.parse({ user: sessionUser }));
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
