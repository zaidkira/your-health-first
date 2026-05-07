import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, doctorsTable, pharmaciesTable } from "@workspace/db";
import { RegisterBody, LoginBody, UpdateProfileBody } from "@workspace/api-zod";
import { hashPassword, verifyPassword, createToken, requireAuth, getUserId } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  try {
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

    if (role === "doctor" && parsed.data.doctorProfile) {
      const dp = parsed.data.doctorProfile;
      await db.insert(doctorsTable).values({
        name,
        specialty: dp.specialty,
        wilaya: wilaya ?? "Algiers",
        address: dp.address,
        phone: phone ?? null,
        availableDays: dp.availableDays,
        availableHours: dp.availableHours,
        consultationFee: dp.consultationFee,
        isOnlineConsultation: dp.isOnlineConsultation ?? false,
        rating: 4.0,
        reviewCount: 0,
      });
    }

    if (role === "pharmacy" && parsed.data.pharmacyProfile) {
      const pp = parsed.data.pharmacyProfile;
      await db.insert(pharmaciesTable).values({
        name,
        wilaya: wilaya ?? "Algiers",
        address: pp.address,
        phone: phone ?? null,
        isOpenNow: true,
        is24h: pp.is24h ?? false,
        openTime: pp.is24h ? "00:00" : (pp.openTime ?? "08:00"),
        closeTime: pp.is24h ? "23:59" : (pp.closeTime ?? "21:00"),
        medicinesJson: JSON.stringify([]),
      });
    }

    const token = createToken(user.id);
    const fullUser = await getFullUser(user);
    res.status(201).json({
      token,
      user: fullUser,
    });
  } catch (err: any) {
    logger.error({ err, body: req.body }, "Registration error");
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

async function getFullUser(user: any) {
  const response: any = {
    id: user.id, name: user.name, email: user.email,
    phone: user.phone ?? null, wilaya: user.wilaya ?? null,
    bloodType: user.bloodType ?? null,
    role: user.role, createdAt: user.createdAt.toISOString(),
  };

  if (user.role === "doctor") {
    const [doc] = await db.select().from(doctorsTable).where(eq(doctorsTable.name, user.name));
    if (doc) {
      response.doctorProfile = {
        specialty: doc.specialty,
        address: doc.address,
        availableDays: doc.availableDays,
        availableHours: doc.availableHours,
        consultationFee: doc.consultationFee,
        isOnlineConsultation: doc.isOnlineConsultation,
        lat: doc.lat,
        lng: doc.lng,
      };
    }
  } else if (user.role === "pharmacy") {
    const [ph] = await db.select().from(pharmaciesTable).where(eq(pharmaciesTable.name, user.name));
    if (ph) {
      response.pharmacyProfile = {
        address: ph.address,
        is24h: ph.is24h,
        openTime: ph.openTime,
        closeTime: ph.closeTime,
        lat: ph.lat,
        lng: ph.lng,
      };
    }
  }
  return response;
}

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
  const fullUser = await getFullUser(user);
  res.json({
    token,
    user: fullUser,
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }
  const fullUser = await getFullUser(user);
  res.json(fullUser);
});

// GET /auth/profile – full profile including doctor/pharmacy data
router.get("/auth/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const response: any = {
    id: user.id, name: user.name, email: user.email,
    phone: user.phone ?? null, wilaya: user.wilaya ?? null,
    bloodType: user.bloodType ?? null,
    role: user.role, createdAt: user.createdAt.toISOString(),
  };

  if (user.role === "doctor") {
    const doctors = await db.select().from(doctorsTable)
      .where(eq(doctorsTable.name, user.name));
    const doc = doctors[0];
    if (doc) {
      response.doctorProfile = {
        specialty: doc.specialty,
        address: doc.address,
        availableDays: doc.availableDays,
        availableHours: doc.availableHours,
        consultationFee: doc.consultationFee,
        isOnlineConsultation: doc.isOnlineConsultation,
        lat: doc.lat,
        lng: doc.lng,
      };
    }
  }

  if (user.role === "pharmacy") {
    const pharmacies = await db.select().from(pharmaciesTable)
      .where(eq(pharmaciesTable.name, user.name));
    const ph = pharmacies[0];
    if (ph) {
      response.pharmacyProfile = {
        address: ph.address,
        is24h: ph.is24h,
        openTime: ph.openTime,
        closeTime: ph.closeTime,
        lat: ph.lat,
        lng: ph.lng,
      };
    }
  }

  res.json(response);
});

// PUT /auth/profile – update user info + optional doctor/pharmacy profile
router.put("/auth/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const { name, phone, wilaya, bloodType } = parsed.data;

  const [updated] = await db
    .update(usersTable)
    .set({
      name:      name      ?? user.name,
      phone:     phone     !== undefined ? phone     : user.phone,
      wilaya:    wilaya    !== undefined ? wilaya    : user.wilaya,
      bloodType: bloodType !== undefined ? bloodType : user.bloodType,
    })
    .where(eq(usersTable.id, userId))
    .returning();

  const response: any = {
    id: updated.id, name: updated.name, email: updated.email,
    phone: updated.phone ?? null, wilaya: updated.wilaya ?? null,
    bloodType: updated.bloodType ?? null,
    role: updated.role, createdAt: updated.createdAt.toISOString(),
  };

  // Update doctor profile
  if (user.role === "doctor" && parsed.data.doctorProfile) {
    const dp = parsed.data.doctorProfile;
    const existing = await db.select().from(doctorsTable)
      .where(eq(doctorsTable.name, user.name));

    if (existing.length > 0) {
      await db.update(doctorsTable)
        .set({
          name: updated.name,
          specialty: dp.specialty,
          address: dp.address,
          wilaya: updated.wilaya ?? existing[0].wilaya,
          phone: updated.phone ?? existing[0].phone,
          availableDays: dp.availableDays,
          availableHours: dp.availableHours,
          consultationFee: dp.consultationFee,
          isOnlineConsultation: dp.isOnlineConsultation ?? false,
          lat: dp.lat ?? existing[0].lat,
          lng: dp.lng ?? existing[0].lng,
        })
        .where(eq(doctorsTable.name, user.name));
    } else {
      await db.insert(doctorsTable).values({
        name: updated.name, specialty: dp.specialty,
        wilaya: updated.wilaya ?? "Algiers", address: dp.address,
        phone: updated.phone ?? null,
        availableDays: dp.availableDays,
        availableHours: dp.availableHours,
        consultationFee: dp.consultationFee,
        isOnlineConsultation: dp.isOnlineConsultation ?? false,
        lat: dp.lat ?? null,
        lng: dp.lng ?? null,
        rating: 4.0, reviewCount: 0,
      });
    }
    response.doctorProfile = {
      specialty: dp.specialty, address: dp.address,
      availableDays: dp.availableDays, availableHours: dp.availableHours,
      consultationFee: dp.consultationFee,
      isOnlineConsultation: dp.isOnlineConsultation ?? false,
      lat: dp.lat ?? null,
      lng: dp.lng ?? null,
    };
  }

  // Update pharmacy profile
  if (user.role === "pharmacy" && parsed.data.pharmacyProfile) {
    const pp = parsed.data.pharmacyProfile;
    const existing = await db.select().from(pharmaciesTable)
      .where(eq(pharmaciesTable.name, user.name));

    const newOpenTime  = pp.is24h ? "00:00" : (pp.openTime  ?? "08:00");
    const newCloseTime = pp.is24h ? "23:59" : (pp.closeTime ?? "21:00");
    if (existing.length > 0) {
      await db.update(pharmaciesTable)
        .set({
          name: updated.name, address: pp.address,
          wilaya: updated.wilaya ?? existing[0].wilaya,
          phone: updated.phone ?? existing[0].phone,
          is24h: pp.is24h ?? false,
          openTime: newOpenTime,
          closeTime: newCloseTime,
          lat: pp.lat ?? existing[0].lat,
          lng: pp.lng ?? existing[0].lng,
        })
        .where(eq(pharmaciesTable.name, user.name));
    } else {
      await db.insert(pharmaciesTable).values({
        name: updated.name, wilaya: updated.wilaya ?? "Algiers",
        address: pp.address, phone: updated.phone ?? null,
        isOpenNow: true, is24h: pp.is24h ?? false,
        openTime: newOpenTime, closeTime: newCloseTime,
        lat: pp.lat ?? null, lng: pp.lng ?? null,
        medicinesJson: JSON.stringify([]),
      });
    }
    response.pharmacyProfile = {
      address: pp.address, is24h: pp.is24h ?? false,
      openTime: newOpenTime, closeTime: newCloseTime,
      lat: pp.lat ?? null, lng: pp.lng ?? null,
    };
  }

  res.json(response);
});

export default router;
