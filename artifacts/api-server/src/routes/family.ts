import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, familyMembersTable } from "@workspace/db";
import { CreateFamilyMemberBody, UpdateFamilyMemberBody, UpdateFamilyMemberParams, DeleteFamilyMemberParams } from "@workspace/api-zod";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

router.get("/family", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const members = await db.select().from(familyMembersTable).where(eq(familyMembersTable.userId, userId));
  res.json(members.map(m => ({ ...m, createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() })));
});

router.post("/family", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const parsed = CreateFamilyMemberBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [member] = await db.insert(familyMembersTable).values({ ...parsed.data, userId }).returning();
  res.status(201).json({ ...member, createdAt: member.createdAt.toISOString(), updatedAt: member.updatedAt.toISOString() });
});

router.patch("/family/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateFamilyMemberParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = UpdateFamilyMemberBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const [member] = await db.update(familyMembersTable).set(body.data)
    .where(and(eq(familyMembersTable.id, params.data.id), eq(familyMembersTable.userId, userId)))
    .returning();
  if (!member) { res.status(404).json({ error: "Family member not found" }); return; }
  res.json({ ...member, createdAt: member.createdAt.toISOString(), updatedAt: member.updatedAt.toISOString() });
});

router.delete("/family/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = DeleteFamilyMemberParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [member] = await db.delete(familyMembersTable)
    .where(and(eq(familyMembersTable.id, params.data.id), eq(familyMembersTable.userId, userId)))
    .returning();
  if (!member) { res.status(404).json({ error: "Family member not found" }); return; }
  res.sendStatus(204);
});

export default router;
