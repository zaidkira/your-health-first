import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, medicationsTable, medicationRemindersTable, familyMembersTable } from "@workspace/db";
import { CreateMedicationBody, UpdateMedicationBody, GetMedicationParams, UpdateMedicationParams, DeleteMedicationParams, MarkMedicationTakenParams } from "@workspace/api-zod";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

function buildRemindersForToday(medicationId: number, userId: number, times: string, date: string) {
  return times.split("|").filter(Boolean).map(t => ({
    medicationId,
    userId,
    scheduledTime: t.trim(),
    date,
    taken: false,
  }));
}

router.get("/medications", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const meds = await db.select().from(medicationsTable).where(eq(medicationsTable.userId, userId));
  res.json(meds.map(m => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  })));
});

router.post("/medications", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const parsed = CreateMedicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [med] = await db.insert(medicationsTable).values({ ...parsed.data, userId }).returning();

  const today = new Date().toISOString().split("T")[0];
  if (med.startDate <= today && (!med.endDate || med.endDate >= today) && med.isActive) {
    const reminders = buildRemindersForToday(med.id, userId, med.times, today);
    if (reminders.length > 0) {
      await db.insert(medicationRemindersTable).values(reminders);
    }
  }

  res.status(201).json({ ...med, createdAt: med.createdAt.toISOString(), updatedAt: med.updatedAt.toISOString() });
});

router.get("/medications/today", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const today = new Date().toISOString().split("T")[0];

  const reminders = await db.select().from(medicationRemindersTable).where(
    and(eq(medicationRemindersTable.userId, userId), eq(medicationRemindersTable.date, today))
  );

  if (reminders.length === 0) {
    const activeMeds = await db.select().from(medicationsTable).where(
      and(eq(medicationsTable.userId, userId), eq(medicationsTable.isActive, true))
    );
    const toInsert = activeMeds.filter(m => m.startDate <= today && (!m.endDate || m.endDate >= today))
      .flatMap(m => buildRemindersForToday(m.id, userId, m.times, today));
    if (toInsert.length > 0) {
      const inserted = await db.insert(medicationRemindersTable).values(toInsert).returning();
      const enriched = await Promise.all(inserted.map(async r => {
        const [med] = await db.select().from(medicationsTable).where(eq(medicationsTable.id, r.medicationId));
        let familyMemberName: string | null = null;
        if (med?.familyMemberId) {
          const [fm] = await db.select().from(familyMembersTable).where(eq(familyMembersTable.id, med.familyMemberId));
          familyMemberName = fm?.name ?? null;
        }
        return {
          id: r.id, medicationId: r.medicationId, medicationName: med?.name ?? "", dosage: med?.dosage ?? "",
          scheduledTime: r.scheduledTime, taken: r.taken, takenAt: r.takenAt?.toISOString() ?? null,
          date: r.date, familyMemberName,
        };
      }));
      res.json(enriched);
      return;
    }
    res.json([]);
    return;
  }

  const enriched = await Promise.all(reminders.map(async r => {
    const [med] = await db.select().from(medicationsTable).where(eq(medicationsTable.id, r.medicationId));
    let familyMemberName: string | null = null;
    if (med?.familyMemberId) {
      const [fm] = await db.select().from(familyMembersTable).where(eq(familyMembersTable.id, med.familyMemberId));
      familyMemberName = fm?.name ?? null;
    }
    return {
      id: r.id, medicationId: r.medicationId, medicationName: med?.name ?? "", dosage: med?.dosage ?? "",
      scheduledTime: r.scheduledTime, taken: r.taken, takenAt: r.takenAt?.toISOString() ?? null,
      date: r.date, familyMemberName,
    };
  }));
  res.json(enriched);
});

router.get("/medications/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = GetMedicationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [med] = await db.select().from(medicationsTable).where(
    and(eq(medicationsTable.id, params.data.id), eq(medicationsTable.userId, userId))
  );
  if (!med) { res.status(404).json({ error: "Medication not found" }); return; }
  res.json({ ...med, createdAt: med.createdAt.toISOString(), updatedAt: med.updatedAt.toISOString() });
});

router.patch("/medications/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateMedicationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = UpdateMedicationBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const [med] = await db.update(medicationsTable).set(body.data)
    .where(and(eq(medicationsTable.id, params.data.id), eq(medicationsTable.userId, userId))).returning();
  if (!med) { res.status(404).json({ error: "Medication not found" }); return; }
  res.json({ ...med, createdAt: med.createdAt.toISOString(), updatedAt: med.updatedAt.toISOString() });
});

router.delete("/medications/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = DeleteMedicationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [med] = await db.delete(medicationsTable).where(
    and(eq(medicationsTable.id, params.data.id), eq(medicationsTable.userId, userId))
  ).returning();
  if (!med) { res.status(404).json({ error: "Medication not found" }); return; }
  res.sendStatus(204);
});

router.post("/medications/:id/taken", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = MarkMedicationTakenParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const today = new Date().toISOString().split("T")[0];
  const reminders = await db.select().from(medicationRemindersTable).where(
    and(
      eq(medicationRemindersTable.medicationId, params.data.id),
      eq(medicationRemindersTable.userId, userId),
      eq(medicationRemindersTable.date, today),
      eq(medicationRemindersTable.taken, false)
    )
  );

  if (reminders.length === 0) {
    res.status(404).json({ error: "No pending reminder found for today" });
    return;
  }

  const [updated] = await db.update(medicationRemindersTable)
    .set({ taken: true, takenAt: new Date() })
    .where(eq(medicationRemindersTable.id, reminders[0].id))
    .returning();

  const [med] = await db.select().from(medicationsTable).where(eq(medicationsTable.id, params.data.id));
  res.json({
    id: updated.id, medicationId: updated.medicationId, medicationName: med?.name ?? "",
    dosage: med?.dosage ?? "", scheduledTime: updated.scheduledTime, taken: updated.taken,
    takenAt: updated.takenAt?.toISOString() ?? null, date: updated.date, familyMemberName: null,
  });
});

export default router;
