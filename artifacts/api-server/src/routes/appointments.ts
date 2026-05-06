import { Router, type IRouter } from "express";
import { eq, and, gte, desc } from "drizzle-orm";
import { db, appointmentsTable, doctorsTable, familyMembersTable } from "@workspace/db";
import { CreateAppointmentBody, UpdateAppointmentBody, UpdateAppointmentParams, DeleteAppointmentParams } from "@workspace/api-zod";
import { requireAuth, getUserId } from "../lib/auth";
import { usersTable } from "@workspace/db";

const router: IRouter = Router();

const fmt = (a: typeof appointmentsTable.$inferSelect) => ({ ...a, createdAt: a.createdAt.toISOString() });

router.get("/appointments", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  
  if (user.role === "doctor") {
    const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.name, user.name));
    if (doctor) {
      const appts = await db.select().from(appointmentsTable)
        .where(eq(appointmentsTable.doctorId, doctor.id))
        .orderBy(desc(appointmentsTable.appointmentDate));
      res.json(appts.map(fmt));
      return;
    }
  }

  const appts = await db.select().from(appointmentsTable)
    .where(eq(appointmentsTable.userId, userId))
    .orderBy(desc(appointmentsTable.appointmentDate));
  res.json(appts.map(fmt));
});

router.post("/appointments", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, parsed.data.doctorId));
  if (!doctor) { res.status(404).json({ error: "Doctor not found" }); return; }

  let familyMemberName: string | null = null;
  if (parsed.data.familyMemberId) {
    const [fm] = await db.select().from(familyMembersTable).where(eq(familyMembersTable.id, parsed.data.familyMemberId));
    familyMemberName = fm?.name ?? null;
  }

  const [appt] = await db.insert(appointmentsTable).values({
    userId,
    familyMemberId: parsed.data.familyMemberId ?? null,
    familyMemberName,
    doctorId: parsed.data.doctorId,
    doctorName: doctor.name,
    doctorSpecialty: doctor.specialty,
    appointmentDate: parsed.data.appointmentDate,
    appointmentTime: parsed.data.appointmentTime,
    notes: parsed.data.notes ?? null,
    isOnline: parsed.data.isOnline ?? false,
    status: "scheduled",
  }).returning();

  res.status(201).json(fmt(appt));
});

router.get("/appointments/upcoming", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const today = new Date().toISOString().split("T")[0];
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (user.role === "doctor") {
    const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.name, user.name));
    if (doctor) {
      const upcoming = await db.select().from(appointmentsTable).where(
        and(
          eq(appointmentsTable.doctorId, doctor.id),
          eq(appointmentsTable.status, "scheduled"),
          gte(appointmentsTable.appointmentDate, today)
        )
      ).orderBy(desc(appointmentsTable.appointmentDate)).limit(3);
      res.json(upcoming.map(fmt));
      return;
    }
  }

  const upcoming = await db.select().from(appointmentsTable).where(
    and(
      eq(appointmentsTable.userId, userId),
      eq(appointmentsTable.status, "scheduled"),
      gte(appointmentsTable.appointmentDate, today)
    )
  ).orderBy(desc(appointmentsTable.appointmentDate)).limit(3);
  res.json(upcoming.map(fmt));
});

router.patch("/appointments/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateAppointmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = UpdateAppointmentBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const [appointment] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, params.data.id));

  if (!appointment) { res.status(404).json({ error: "Appointment not found" }); return; }

  let authorized = false;
  if (appointment.userId === userId) {
    authorized = true;
  } else if (user.role === "doctor") {
    const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.name, user.name));
    if (doctor && appointment.doctorId === doctor.id) {
      authorized = true;
    }
  }

  if (!authorized) { res.status(403).json({ error: "Not authorized" }); return; }

  const [appt] = await db.update(appointmentsTable).set(body.data)
    .where(eq(appointmentsTable.id, params.data.id))
    .returning();
  
  res.json(fmt(appt));
});

router.delete("/appointments/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = DeleteAppointmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [appt] = await db.delete(appointmentsTable)
    .where(and(eq(appointmentsTable.id, params.data.id), eq(appointmentsTable.userId, userId)))
    .returning();
  if (!appt) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.sendStatus(204);
});

export default router;
