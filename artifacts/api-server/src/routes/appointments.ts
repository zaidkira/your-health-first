import { Router, type IRouter } from "express";
import { eq, and, gte, desc } from "drizzle-orm";
import { db, appointmentsTable, doctorsTable } from "@workspace/db";
import { CreateAppointmentBody, UpdateAppointmentBody, UpdateAppointmentParams, DeleteAppointmentParams } from "@workspace/api-zod";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

router.get("/appointments", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const appts = await db.select().from(appointmentsTable)
    .where(eq(appointmentsTable.userId, userId))
    .orderBy(desc(appointmentsTable.appointmentDate));
  res.json(appts.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })));
});

router.post("/appointments", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, parsed.data.doctorId));
  if (!doctor) { res.status(404).json({ error: "Doctor not found" }); return; }

  const [appt] = await db.insert(appointmentsTable).values({
    userId,
    doctorId: parsed.data.doctorId,
    doctorName: doctor.name,
    doctorSpecialty: doctor.specialty,
    appointmentDate: parsed.data.appointmentDate,
    appointmentTime: parsed.data.appointmentTime,
    notes: parsed.data.notes ?? null,
    isOnline: parsed.data.isOnline ?? false,
    status: "scheduled",
  }).returning();

  res.status(201).json({ ...appt, createdAt: appt.createdAt.toISOString() });
});

router.get("/appointments/upcoming", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const today = new Date().toISOString().split("T")[0];
  const upcoming = await db.select().from(appointmentsTable).where(
    and(
      eq(appointmentsTable.userId, userId),
      eq(appointmentsTable.status, "scheduled"),
      gte(appointmentsTable.appointmentDate, today)
    )
  ).limit(3);
  res.json(upcoming.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })));
});

router.patch("/appointments/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateAppointmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = UpdateAppointmentBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const [appt] = await db.update(appointmentsTable).set(body.data)
    .where(and(eq(appointmentsTable.id, params.data.id), eq(appointmentsTable.userId, userId)))
    .returning();
  if (!appt) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json({ ...appt, createdAt: appt.createdAt.toISOString() });
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
