import { Router, type IRouter } from "express";
import { eq, and, or } from "drizzle-orm";
import { db, connectionsTable, usersTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

router.get("/connections", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  
  const connections = await db.select().from(connectionsTable).where(
    or(eq(connectionsTable.senderId, userId), eq(connectionsTable.receiverId, userId))
  );

  const enriched = await Promise.all(connections.map(async c => {
    const [sender] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, c.senderId));
    const [receiver] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, c.receiverId));
    return { 
      ...c, 
      createdAt: c.createdAt.toISOString(),
      senderName: sender?.name ?? "Unknown",
      receiverName: receiver?.name ?? "Unknown"
    };
  }));

  res.json(enriched);
});

router.post("/connections", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: "Email is required" }); return; }

  const [receiver] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!receiver) { res.status(404).json({ error: "User not found" }); return; }
  if (receiver.id === userId) { res.status(400).json({ error: "Cannot connect to yourself" }); return; }

  const [existing] = await db.select().from(connectionsTable).where(
    or(
      and(eq(connectionsTable.senderId, userId), eq(connectionsTable.receiverId, receiver.id)),
      and(eq(connectionsTable.senderId, receiver.id), eq(connectionsTable.receiverId, userId))
    )
  );
  if (existing) { res.status(400).json({ error: "Connection already exists or pending" }); return; }

  const [connection] = await db.insert(connectionsTable).values({
    senderId: userId,
    receiverId: receiver.id,
    status: "pending",
  }).returning();

  const [sender] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));
  
  res.status(201).json({ 
    ...connection, 
    createdAt: connection.createdAt.toISOString(),
    senderName: sender?.name,
    receiverName: receiver.name
  });
});

router.patch("/connections/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const id = parseInt(req.params.id as string);
  const { status } = req.body;

  if (!["accepted", "rejected"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const [connection] = await db.select().from(connectionsTable).where(eq(connectionsTable.id, id));
  if (!connection) { res.status(404).json({ error: "Connection not found" }); return; }
  if (connection.receiverId !== userId) { res.status(403).json({ error: "Only receiver can respond" }); return; }

  const [updated] = await db.update(connectionsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(connectionsTable.id, id))
    .returning();

  const [sender] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.senderId));
  const [receiver] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.receiverId));

  res.json({ 
    ...updated, 
    createdAt: updated.createdAt.toISOString(),
    senderName: sender?.name,
    receiverName: receiver?.name
  });
});

router.delete("/connections/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const id = parseInt(req.params.id as string);

  const [connection] = await db.select().from(connectionsTable).where(eq(connectionsTable.id, id));
  if (!connection) { res.status(404).json({ error: "Connection not found" }); return; }
  if (connection.senderId !== userId && connection.receiverId !== userId) {
    res.status(403).json({ error: "Permission denied" });
    return;
  }

  await db.delete(connectionsTable).where(eq(connectionsTable.id, id));
  res.status(204).send();
});

export default router;
