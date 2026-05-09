import { Router, type IRouter } from "express";
import { ilike, and } from "drizzle-orm";
import { db, pharmaciesTable, usersTable } from "@workspace/db";
import { ListPharmaciesQueryParams } from "@workspace/api-zod";
import { requireAuth, getUserId } from "../lib/auth";
import * as zod from "zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function checkIsOpenNow(is24h: boolean, openTime: string, closeTime: string): boolean {
  if (is24h) return true;
  if (!openTime || !closeTime) return true;
  
  const now = new Date();
  // We use local server time (which should be configured properly or offset to Algeria time if needed).
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour + currentMinute / 60;
  
  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);
  
  const open = (openH || 0) + (openM || 0) / 60;
  const close = (closeH || 0) + (closeM || 0) / 60;
  
  if (open < close) {
    return currentTime >= open && currentTime <= close;
  } else {
    // Overnight pharmacy (e.g. 20:00 to 08:00)
    return currentTime >= open || currentTime <= close;
  }
}

router.get("/pharmacies", async (req, res): Promise<void> => {
  const params = ListPharmaciesQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  let allPharmacies = await db.select().from(pharmaciesTable);

  let filtered = allPharmacies;
  if (params.data.medicine) {
    const search = params.data.medicine.toLowerCase();
    filtered = filtered.filter(p => {
      const meds = JSON.parse(p.medicinesJson ?? "[]") as Array<{ name: string }>;
      return meds.some(m => m.name.toLowerCase().includes(search));
    });
  }
  if (params.data.wilaya) {
    const search = params.data.wilaya.toLowerCase();
    filtered = filtered.filter(p => p.wilaya.toLowerCase().includes(search));
  }

  const result = filtered.map(p => ({
    ...p,
    isOpenNow: checkIsOpenNow(p.is24h, p.openTime, p.closeTime),
    medicines: JSON.parse(p.medicinesJson ?? "[]"),
    medicinesJson: undefined,
  }));

  res.json(result);
});

const UpdateMedicinesBody = zod.array(
  zod.object({
    name: zod.string(),
    available: zod.boolean(),
    price: zod.number().nullish(),
  })
);

router.put("/pharmacies/medicines", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const parsed = UpdateMedicinesBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.role !== "pharmacy") {
    res.status(403).json({ error: "Only pharmacies can update medicines" }); return;
  }

  const [pharmacy] = await db.select().from(pharmaciesTable).where(eq(pharmaciesTable.name, user.name));
  if (!pharmacy) {
    res.status(404).json({ error: "Pharmacy profile not found" }); return;
  }

  const updated = await db.update(pharmaciesTable)
    .set({ medicinesJson: JSON.stringify(parsed.data) })
    .where(eq(pharmaciesTable.id, pharmacy.id))
    .returning();

  res.json({ success: true, medicines: JSON.parse(updated[0].medicinesJson ?? "[]") });
});

export default router;
