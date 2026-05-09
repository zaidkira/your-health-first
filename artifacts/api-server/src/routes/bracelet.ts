import { Router, type Request, type Response } from "express";
import { db, braceletReadingsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

const BRACELET_API_KEY = process.env.BRACELET_API_KEY || "bracelet-secret-key";

// Test route to verify the router is mounted
router.get("/status", (_req, res) => {
  res.json({ status: "active", message: "Bracelet API is online" });
});

// Ingest data from ESP32 or Web App bridge
router.post("/data", async (req: Request, res: Response): Promise<any> => {
  const apiKey = req.headers["x-api-key"] as string;
  const authHeader = req.headers.authorization;
  
  let targetUserId: number | null = null;
  let usedDeviceId: string = req.body.device_id || "UNKNOWN";

  // Case 1: Request comes from the Web App (Authenticated User)
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { verifyToken } = await import("../lib/auth");
    const decoded = verifyToken(token);
    if (decoded) {
      targetUserId = decoded.userId;
      logger.info({ userId: targetUserId }, "Received bracelet data via Web App bridge");
    }
  }

  // Case 2: Request comes from ESP32 directly (API Key + Device ID)
  if (!targetUserId) {
    if (apiKey !== BRACELET_API_KEY) {
      logger.warn({ received: apiKey }, "Invalid Bracelet API Key");
      return res.status(401).json({ error: "Invalid API Key" });
    }

    const { device_id } = req.body;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.deviceId, device_id)).limit(1);

    if (!user) {
      logger.warn({ device_id }, "Unrecognized Device ID received");
      return res.status(400).json({ 
        error: "Unrecognized Device", 
        message: `Device ID "${device_id}" is not linked to any user. Please link your bracelet in the settings.` 
      });
    }
    targetUserId = user.id;
    usedDeviceId = device_id;
  }

  const { heartRate, spo2, steps, activity } = req.body;

  try {
    // Save reading
    await db.insert(braceletReadingsTable).values({
      userId: targetUserId,
      deviceId: usedDeviceId,
      heartRate,
      spo2,
      steps,
      activity: activity || (steps > 10 ? "active" : "resting")
    });

    logger.info({ userId: targetUserId }, "Successfully saved bracelet reading");
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to save bracelet reading");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get latest readings for a user
router.get("/latest/:userId", requireAuth, async (req: Request, res: Response): Promise<any> => {
  const userId = parseInt(req.params.userId as string);

  try {
    const readings = await db.select()
      .from(braceletReadingsTable)
      .where(eq(braceletReadingsTable.userId, userId))
      .orderBy(desc(braceletReadingsTable.timestamp))
      .limit(20);

    // Return in chronological order (oldest to newest) for charts
    return res.json(readings.reverse());
  } catch (err) {
    logger.error({ err }, "Failed to fetch bracelet readings");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Link device to user
router.post("/link", requireAuth, async (req: Request, res: Response): Promise<any> => {
  const { device_id } = req.body;
  const userId = (req as any).userId;

  try {
    await db.update(usersTable)
      .set({ deviceId: device_id })
      .where(eq(usersTable.id, userId));

    return res.json({ success: true, message: "Device linked successfully" });
  } catch (err) {
    logger.error({ err }, "Failed to link device");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
