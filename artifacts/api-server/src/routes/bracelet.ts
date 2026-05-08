import { Router, type Request, type Response } from "express";
import { db, braceletReadingsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

const BRACELET_API_KEY = process.env.BRACELET_API_KEY || "bracelet-secret-key";

// Ingest data from ESP32
router.post("/data", async (req: Request, res: Response): Promise<any> => {
  const apiKey = req.headers["x-api-key"] as string;
  
  if (apiKey !== BRACELET_API_KEY) {
    return res.status(401).json({ error: "Invalid API Key" });
  }

  const { device_id, heartRate, spo2, steps, activity } = req.body;

  try {
    // Find user linked to this device
    const [user] = await db.select().from(usersTable).where(eq(usersTable.deviceId, device_id)).limit(1);

    if (!user) {
      return res.status(404).json({ error: "Device not linked to any user" });
    }

    // Save reading
    await db.insert(braceletReadingsTable).values({
      userId: user.id,
      deviceId: device_id,
      heartRate,
      spo2,
      steps,
      activity
    });

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
