import { Router, type IRouter } from "express";
import { ilike, and } from "drizzle-orm";
import { db, pharmaciesTable } from "@workspace/db";
import { ListPharmaciesQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

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
    medicines: JSON.parse(p.medicinesJson ?? "[]"),
    medicinesJson: undefined,
  }));

  res.json(result);
});

export default router;
