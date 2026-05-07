import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, groupsTable, groupMembersTable, groupMessagesTable, usersTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

router.get("/groups", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const memberships = await db.select().from(groupMembersTable).where(eq(groupMembersTable.userId, userId));
  if (memberships.length === 0) { res.json([]); return; }

  const groupIds = memberships.map(m => m.groupId);
  const groups = await db.select().from(groupsTable).where(inArray(groupsTable.id, groupIds));
  
  const enriched = await Promise.all(groups.map(async g => {
    const members = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, g.id));
    return { ...g, createdAt: g.createdAt.toISOString(), memberCount: members.length };
  }));

  res.json(enriched);
});

router.post("/groups", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const { name, description } = req.body;
  if (!name) { res.status(400).json({ error: "Name is required" }); return; }

  const [group] = await db.insert(groupsTable).values({
    name,
    description,
    createdById: userId,
  }).returning();

  await db.insert(groupMembersTable).values({
    groupId: group.id,
    userId: userId,
  });

  res.status(201).json({ ...group, createdAt: group.createdAt.toISOString(), memberCount: 1 });
});

router.get("/groups/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const groupId = parseInt(req.params.id);

  const [membership] = await db.select().from(groupMembersTable).where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)));
  if (!membership) { res.status(403).json({ error: "Not a member" }); return; }

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId));
  if (!group) { res.status(404).json({ error: "Group not found" }); return; }

  const membersRows = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, groupId));
  const memberUsers = await Promise.all(membersRows.map(async m => {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, m.userId));
    return { id: u.id, name: u.name, email: u.email, role: u.role };
  }));

  res.json({ ...group, createdAt: group.createdAt.toISOString(), members: memberUsers, memberCount: memberUsers.length });
});

router.delete("/groups/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const groupId = parseInt(req.params.id);

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId));
  if (!group) { res.status(404).json({ error: "Group not found" }); return; }
  if (group.createdById !== userId) { res.status(403).json({ error: "Admin only" }); return; }

  await db.delete(groupMembersTable).where(eq(groupMembersTable.groupId, groupId));
  await db.delete(groupMessagesTable).where(eq(groupMessagesTable.groupId, groupId));
  await db.delete(groupsTable).where(eq(groupsTable.id, groupId));

  res.status(204).send();
});

router.post("/groups/:id/members", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const groupId = parseInt(req.params.id);
  const { email } = req.body;

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId));
  if (!group) { res.status(404).json({ error: "Group not found" }); return; }
  
  // Only members can invite? Or only admin? Prompt says "invite other registered patients"
  const [membership] = await db.select().from(groupMembersTable).where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)));
  if (!membership) { res.status(403).json({ error: "Not a member" }); return; }

  const [userToInvite] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!userToInvite) { res.status(404).json({ error: "User not found" }); return; }

  const [existing] = await db.select().from(groupMembersTable).where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userToInvite.id)));
  if (existing) { res.status(400).json({ error: "User already in group" }); return; }

  await db.insert(groupMembersTable).values({ groupId, userId: userToInvite.id });
  res.json({ message: "Invited" });
});

router.delete("/groups/:groupId/members/:userId", requireAuth, async (req, res): Promise<void> => {
  const adminId = getUserId(req);
  const groupId = parseInt(req.params.groupId);
  const targetUserId = parseInt(req.params.userId);

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId));
  if (!group) { res.status(404).json({ error: "Group not found" }); return; }

  if (group.createdById !== adminId && adminId !== targetUserId) {
    res.status(403).json({ error: "Permission denied" });
    return;
  }

  await db.delete(groupMembersTable).where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, targetUserId)));
  res.status(204).send();
});

router.get("/groups/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const groupId = parseInt(req.params.id);

  const [membership] = await db.select().from(groupMembersTable).where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)));
  if (!membership) { res.status(403).json({ error: "Not a member" }); return; }

  const messages = await db.select().from(groupMessagesTable).where(eq(groupMessagesTable.groupId, groupId));
  
  const enriched = await Promise.all(messages.map(async m => {
    const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, m.userId));
    return { ...m, createdAt: m.createdAt.toISOString(), userName: u?.name ?? "Unknown" };
  }));

  res.json(enriched);
});

router.post("/groups/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const groupId = parseInt(req.params.id);
  const { content } = req.body;
  if (!content) { res.status(400).json({ error: "Content is required" }); return; }

  const [membership] = await db.select().from(groupMembersTable).where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)));
  if (!membership) { res.status(403).json({ error: "Not a member" }); return; }

  const [msg] = await db.insert(groupMessagesTable).values({ groupId, userId, content }).returning();
  const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));

  res.status(201).json({ ...msg, createdAt: msg.createdAt.toISOString(), userName: u?.name ?? "Me" });
});

export default router;
