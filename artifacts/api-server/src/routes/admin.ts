import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, doctorsTable, pharmaciesTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth";
import { logger } from "../lib/logger";
import { z } from "zod";

const router: IRouter = Router();

async function requireAdmin(req: any, res: any, next: any): Promise<void> {
  const userId = getUserId(req);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Forbidden: admin only" });
    return;
  }
  next();
}

async function buildUserResponse(user: typeof usersTable.$inferSelect) {
  try {
    const response: any = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      wilaya: user.wilaya ?? null,
      bloodType: user.bloodType ?? null,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };

    if (user.role === "doctor") {
      const docs = await db.select().from(doctorsTable).where(eq(doctorsTable.name, user.name));
      const doc = docs[0];
      if (doc) {
        response.doctorProfile = {
          specialty: doc.specialty,
          address: doc.address,
          availableDays: doc.availableDays,
          availableHours: doc.availableHours,
          consultationFee: doc.consultationFee,
          isOnlineConsultation: doc.isOnlineConsultation,
        };
      }
    }

    if (user.role === "pharmacy") {
      const phs = await db.select().from(pharmaciesTable).where(eq(pharmaciesTable.name, user.name));
      const ph = phs[0];
      if (ph) {
        response.pharmacyProfile = {
          address: ph.address,
          is24h: ph.is24h,
          openTime: ph.openTime,
          closeTime: ph.closeTime,
        };
      }
    }

    return response;
  } catch (err) {
    logger.error({ err, userId: user.id }, "Error building user response");
    // Return basic info if details fail
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }
}

router.get("/admin/users", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  logger.info({ count: users.length, requesterId: getUserId(req) }, "Admin fetching user list");
  const result = await Promise.all(users.map(buildUserResponse));
  res.json(result);
});

const AdminUpdateUserBody = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().nullable().optional(),
  wilaya: z.string().nullable().optional(),
  bloodType: z.string().nullable().optional(),
  role: z.enum(["patient", "doctor", "pharmacy", "admin"]).optional(),
  doctorProfile: z.object({
    specialty: z.string(),
    address: z.string(),
    availableDays: z.string(),
    availableHours: z.string(),
    consultationFee: z.number(),
    isOnlineConsultation: z.boolean().optional(),
  }).optional(),
  pharmacyProfile: z.object({
    address: z.string(),
    is24h: z.boolean().optional(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
  }).optional(),
});

router.put("/admin/users/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const targetId = parseInt(String(req.params.id), 10);
  if (isNaN(targetId)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const parsed = AdminUpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, targetId));
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { name, phone, wilaya, bloodType, role, doctorProfile, pharmacyProfile } = parsed.data;

  const [updated] = await db
    .update(usersTable)
    .set({
      name:      name      ?? existing.name,
      phone:     phone     !== undefined ? phone     : existing.phone,
      wilaya:    wilaya    !== undefined ? wilaya    : existing.wilaya,
      bloodType: bloodType !== undefined ? bloodType : existing.bloodType,
      role:      role      ?? existing.role,
    })
    .where(eq(usersTable.id, targetId))
    .returning();

  const newRole = updated.role;

  if (newRole === "doctor" && doctorProfile) {
    const dp = doctorProfile;
    const existingDocs = await db.select().from(doctorsTable).where(eq(doctorsTable.name, existing.name));
    if (existingDocs.length > 0) {
      await db.update(doctorsTable).set({
        name: updated.name,
        specialty: dp.specialty,
        address: dp.address,
        wilaya: updated.wilaya ?? existingDocs[0].wilaya,
        phone: updated.phone ?? existingDocs[0].phone,
        availableDays: dp.availableDays,
        availableHours: dp.availableHours,
        consultationFee: dp.consultationFee,
        isOnlineConsultation: dp.isOnlineConsultation ?? false,
      }).where(eq(doctorsTable.name, existing.name));
    } else {
      await db.insert(doctorsTable).values({
        name: updated.name,
        specialty: dp.specialty,
        wilaya: updated.wilaya ?? "Algiers",
        address: dp.address,
        phone: updated.phone ?? null,
        availableDays: dp.availableDays,
        availableHours: dp.availableHours,
        consultationFee: dp.consultationFee,
        isOnlineConsultation: dp.isOnlineConsultation ?? false,
        rating: 4.0,
        reviewCount: 0,
      });
    }
  }

  if (newRole === "pharmacy" && pharmacyProfile) {
    const pp = pharmacyProfile;
    const newOpenTime  = pp.is24h ? "00:00" : (pp.openTime  ?? "08:00");
    const newCloseTime = pp.is24h ? "23:59" : (pp.closeTime ?? "21:00");
    const existingPhs = await db.select().from(pharmaciesTable).where(eq(pharmaciesTable.name, existing.name));
    if (existingPhs.length > 0) {
      await db.update(pharmaciesTable).set({
        name: updated.name,
        address: pp.address,
        wilaya: updated.wilaya ?? existingPhs[0].wilaya,
        phone: updated.phone ?? existingPhs[0].phone,
        is24h: pp.is24h ?? false,
        openTime: newOpenTime,
        closeTime: newCloseTime,
      }).where(eq(pharmaciesTable.name, existing.name));
    } else {
      await db.insert(pharmaciesTable).values({
        name: updated.name,
        wilaya: updated.wilaya ?? "Algiers",
        address: pp.address,
        phone: updated.phone ?? null,
        isOpenNow: true,
        is24h: pp.is24h ?? false,
        openTime: newOpenTime,
        closeTime: newCloseTime,
        medicinesJson: JSON.stringify([]),
      });
    }
  }

  const response = await buildUserResponse(updated);
  res.json(response);
});

router.delete("/admin/users/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const targetId = parseInt(String(req.params.id), 10);
  if (isNaN(targetId)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  // Optional: prevent self-deletion
  const currentUserId = getUserId(req);
  if (targetId === currentUserId) {
    res.status(400).json({ error: "Cannot delete yourself" });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, targetId));
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Delete associated doctor/pharmacy profile if exists (linked by name in current schema)
  if (existing.role === "doctor") {
    await db.delete(doctorsTable).where(eq(doctorsTable.name, existing.name));
  } else if (existing.role === "pharmacy") {
    await db.delete(pharmaciesTable).where(eq(pharmaciesTable.name, existing.name));
  }

  await db.delete(usersTable).where(eq(usersTable.id, targetId));
  res.sendStatus(204);
});

export default router;
