import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";

const SECRET = process.env.SESSION_SECRET ?? "myhealthfirst-secret-key";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHmac("sha256", SECRET).update(salt + password).digest("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const candidate = createHmac("sha256", SECRET).update(salt + password).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
  } catch {
    return false;
  }
}

export function createToken(userId: number): string {
  const payload = Buffer.from(JSON.stringify({ userId, iat: Date.now() })).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    const [payload, sig] = token.split(".");
    const expected = createHmac("sha256", SECRET).update(payload).digest("base64url");
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  (req as Request & { userId: number }).userId = decoded.userId;
  next();
}

export function getUserId(req: Request): number {
  return (req as Request & { userId: number }).userId;
}
