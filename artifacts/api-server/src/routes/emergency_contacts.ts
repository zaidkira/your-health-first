import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, emergencyContactsTable, familyMembersTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

const MemberParams = z.object({ memberId: z.coerce.number().int().positive() });
const ContactParams = z.object({ memberId: z.coerce.number().int().positive(), id: z.coerce.number().int().positive() });

const CreateBody = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  relationship: z.string().min(1),
  notes: z.string().nullable().optional(),
});

const UpdateBody = CreateBody.partial();

const fmt = (c: typeof emergencyContactsTable.$inferSelect) => ({ ...c, createdAt: c.createdAt.toISOString() });

async function verifyMemberOwnership(userId: number, memberId: number): Promise<boolean> {
  const [member] = await db.select().from(familyMembersTable)
    .where(and(eq(familyMembersTable.id, memberId), eq(familyMembersTable.userId, userId)));
  return !!member;
}

router.get("/family/:memberId/emergency-contacts", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = MemberParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  if (!(await verifyMemberOwnership(userId, params.data.memberId))) {
    res.status(404).json({ error: "Family member not found" }); return;
  }

  const contacts = await db.select().from(emergencyContactsTable)
    .where(and(eq(emergencyContactsTable.familyMemberId, params.data.memberId), eq(emergencyContactsTable.userId, userId)));
  res.json(contacts.map(fmt));
});

router.post("/family/:memberId/emergency-contacts", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = MemberParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = CreateBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  if (!(await verifyMemberOwnership(userId, params.data.memberId))) {
    res.status(404).json({ error: "Family member not found" }); return;
  }

  const [contact] = await db.insert(emergencyContactsTable)
    .values({ ...body.data, notes: body.data.notes ?? null, userId, familyMemberId: params.data.memberId })
    .returning();
  res.status(201).json(fmt(contact));
});

router.patch("/family/:memberId/emergency-contacts/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = ContactParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = UpdateBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const [contact] = await db.update(emergencyContactsTable).set(body.data)
    .where(and(
      eq(emergencyContactsTable.id, params.data.id),
      eq(emergencyContactsTable.familyMemberId, params.data.memberId),
      eq(emergencyContactsTable.userId, userId)
    ))
    .returning();
  if (!contact) { res.status(404).json({ error: "Contact not found" }); return; }
  res.json(fmt(contact));
});

router.delete("/family/:memberId/emergency-contacts/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = ContactParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [contact] = await db.delete(emergencyContactsTable)
    .where(and(
      eq(emergencyContactsTable.id, params.data.id),
      eq(emergencyContactsTable.familyMemberId, params.data.memberId),
      eq(emergencyContactsTable.userId, userId)
    ))
    .returning();
  if (!contact) { res.status(404).json({ error: "Contact not found" }); return; }
  res.sendStatus(204);
});

export default router;
