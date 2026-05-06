import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, chronicConditionsTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

const CreateConditionBody = z.object({
  name: z.string().min(1),
  diagnosedYear: z.string().nullable().optional(),
  severity: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const UpdateConditionBody = CreateConditionBody.partial();
const ConditionParams = z.object({ id: z.coerce.number().int().positive() });

router.get("/conditions", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rows = await db
    .select()
    .from(chronicConditionsTable)
    .where(eq(chronicConditionsTable.userId, userId));
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/conditions", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const parsed = CreateConditionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [row] = await db
    .insert(chronicConditionsTable)
    .values({ ...parsed.data, userId })
    .returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.patch("/conditions/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = ConditionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = UpdateConditionBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const [row] = await db
    .update(chronicConditionsTable)
    .set(body.data)
    .where(and(eq(chronicConditionsTable.id, params.data.id), eq(chronicConditionsTable.userId, userId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Condition not found" }); return; }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/conditions/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = ConditionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [row] = await db
    .delete(chronicConditionsTable)
    .where(and(eq(chronicConditionsTable.id, params.data.id), eq(chronicConditionsTable.userId, userId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Condition not found" }); return; }
  res.sendStatus(204);
});

export default router;
