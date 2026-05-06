import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, sharedRecordsTable, medicalRecordsTable, usersTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

const ShareRecordBody = z.object({
  doctorId: z.number().int().positive(),
  message: z.string().nullable().optional(),
});

const RecordIdParams = z.object({ id: z.coerce.number().int().positive() });

function formatSharedRecord(row: typeof sharedRecordsTable.$inferSelect & {
  record?: typeof medicalRecordsTable.$inferSelect | null;
  doctorName?: string | null;
  senderName?: string | null;
}) {
  return {
    ...row,
    sentAt: row.sentAt.toISOString(),
    record: row.record
      ? { ...row.record, createdAt: row.record.createdAt.toISOString() }
      : undefined,
  };
}

router.post("/records/:id/share", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = RecordIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = ShareRecordBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const [record] = await db
    .select()
    .from(medicalRecordsTable)
    .where(and(eq(medicalRecordsTable.id, params.data.id), eq(medicalRecordsTable.userId, userId)));
  if (!record) { res.status(404).json({ error: "Record not found" }); return; }

  const [shared] = await db
    .insert(sharedRecordsTable)
    .values({ recordId: params.data.id, senderId: userId, doctorId: body.data.doctorId, message: body.data.message ?? null })
    .returning();

  const [doctor] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, body.data.doctorId));
  res.status(201).json(formatSharedRecord({ ...shared, record, doctorName: doctor?.name ?? null }));
});

router.get("/records/sent", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rows = await db.select().from(sharedRecordsTable).where(eq(sharedRecordsTable.senderId, userId));

  const enriched = await Promise.all(rows.map(async row => {
    const [record] = await db.select().from(medicalRecordsTable).where(eq(medicalRecordsTable.id, row.recordId));
    const [doctor] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, row.doctorId));
    return formatSharedRecord({ ...row, record: record ?? null, doctorName: doctor?.name ?? null });
  }));

  res.json(enriched);
});

router.get("/records/received", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rows = await db.select().from(sharedRecordsTable).where(eq(sharedRecordsTable.doctorId, userId));

  const enriched = await Promise.all(rows.map(async row => {
    const [record] = await db.select().from(medicalRecordsTable).where(eq(medicalRecordsTable.id, row.recordId));
    const [sender] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, row.senderId));
    return formatSharedRecord({ ...row, record: record ?? null, senderName: sender?.name ?? null });
  }));

  res.json(enriched);
});

export default router;
