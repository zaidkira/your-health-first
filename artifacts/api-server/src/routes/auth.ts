import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, doctorsTable, pharmaciesTable } from "@workspace/db";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { hashPassword, verifyPassword, createToken, requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, email, password, phone, wilaya } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = hashPassword(password);
  const role = parsed.data.role ?? "patient";
  const [user] = await db
    .insert(usersTable)
    .values({ name, email, passwordHash, phone, wilaya, role })
    .returning();

  // Create doctor profile if registering as doctor
  if (role === "doctor" && parsed.data.doctorProfile) {
    const dp = parsed.data.doctorProfile;
    await db.insert(doctorsTable).values({
      name,
      specialty: dp.specialty,
      wilaya: wilaya ?? "Algiers",
      address: dp.address,
      phone: phone ?? null,
      availableDays: dp.availableDays,
      consultationFee: dp.consultationFee,
      isOnlineConsultation: dp.isOnlineConsultation ?? false,
      rating: 4.0,
      reviewCount: 0,
    });
  }

  // Create pharmacy profile if registering as pharmacy
  if (role === "pharmacy" && parsed.data.pharmacyProfile) {
    const pp = parsed.data.pharmacyProfile;
    const openTime  = pp.openTime  ?? "08:00";
    const closeTime = pp.closeTime ?? "21:00";
    const is24h     = pp.is24h ?? false;
    await db.insert(pharmaciesTable).values({
      name,
      wilaya: wilaya ?? "Algiers",
      address: pp.address,
      phone: phone ?? null,
      isOpenNow: true,
      is24h,
      medicinesJson: JSON.stringify([]),
    });
  }

  const token = createToken(user.id);
  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      wilaya: user.wilaya ?? null,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = createToken(user.id);
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      wilaya: user.wilaya ?? null,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    wilaya: user.wilaya ?? null,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
