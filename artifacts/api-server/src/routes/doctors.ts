import { Router, type IRouter } from "express";
import { eq, ilike, and } from "drizzle-orm";
import { db, doctorsTable } from "@workspace/db";
import { ListDoctorsQueryParams, GetDoctorParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/doctors", async (req, res): Promise<void> => {
  const params = ListDoctorsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  let query = db.select().from(doctorsTable);

  const conditions = [];
  if (params.data.specialty) {
    conditions.push(ilike(doctorsTable.specialty, `%${params.data.specialty}%`));
  }
  if (params.data.wilaya) {
    conditions.push(ilike(doctorsTable.wilaya, `%${params.data.wilaya}%`));
  }

  const doctors = conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;

  res.json(doctors);
});

router.get("/doctors/:id", async (req, res): Promise<void> => {
  const params = GetDoctorParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, params.data.id));
  if (!doctor) { res.status(404).json({ error: "Doctor not found" }); return; }
  res.json(doctor);
});

export default router;
