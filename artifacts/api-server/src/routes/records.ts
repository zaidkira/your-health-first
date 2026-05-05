import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, medicalRecordsTable } from "@workspace/db";
import { CreateRecordBody, GetRecordParams, DeleteRecordParams } from "@workspace/api-zod";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

router.get("/records", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const records = await db.select().from(medicalRecordsTable).where(eq(medicalRecordsTable.userId, userId));
  res.json(records.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/records", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const parsed = CreateRecordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [record] = await db.insert(medicalRecordsTable).values({ ...parsed.data, userId }).returning();
  res.status(201).json({ ...record, createdAt: record.createdAt.toISOString() });
});

router.get("/records/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = GetRecordParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [record] = await db.select().from(medicalRecordsTable).where(
    and(eq(medicalRecordsTable.id, params.data.id), eq(medicalRecordsTable.userId, userId))
  );
  if (!record) { res.status(404).json({ error: "Record not found" }); return; }
  res.json({ ...record, createdAt: record.createdAt.toISOString() });
});

router.delete("/records/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = DeleteRecordParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [record] = await db.delete(medicalRecordsTable).where(
    and(eq(medicalRecordsTable.id, params.data.id), eq(medicalRecordsTable.userId, userId))
  ).returning();
  if (!record) { res.status(404).json({ error: "Record not found" }); return; }
  res.sendStatus(204);
});

export default router;
