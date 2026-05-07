import { Router, type IRouter } from "express";
import { eq, and, gte, count } from "drizzle-orm";
import { db, medicationsTable, medicalRecordsTable, appointmentsTable, familyMembersTable, medicationRemindersTable, usersTable, doctorsTable, sharedRecordsTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const today = new Date().toISOString().split("T")[0];

  const [activeMeds] = await db
    .select({ count: count() })
    .from(medicationsTable)
    .where(and(eq(medicationsTable.userId, userId), eq(medicationsTable.isActive, true)));

  const todayReminders = await db
    .select()
    .from(medicationRemindersTable)
    .where(and(eq(medicationRemindersTable.userId, userId), eq(medicationRemindersTable.date, today)));

  const takenToday = todayReminders.filter(r => r.taken).length;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  let upcomingApptsCondition = eq(appointmentsTable.userId, userId);
  
  if (user.role === "doctor") {
    const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.userId, user.id));
    if (doctor) {
      upcomingApptsCondition = eq(appointmentsTable.doctorId, doctor.id);
    }
  }

  const [upcomingCount] = await db
    .select({ count: count() })
    .from(appointmentsTable)
    .where(
      and(
        upcomingApptsCondition,
        eq(appointmentsTable.status, "scheduled"),
        gte(appointmentsTable.appointmentDate, today)
      )
    );

  const [recordsCount] = await db
    .select({ count: count() })
    .from(medicalRecordsTable)
    .where(eq(medicalRecordsTable.userId, userId));

  const [familyCount] = await db
    .select({ count: count() })
    .from(familyMembersTable)
    .where(eq(familyMembersTable.userId, userId));

  let finalRecordsCount = Number(recordsCount?.count ?? 0);
  if (user.role === "doctor") {
    const [receivedCount] = await db
      .select({ count: count() })
      .from(sharedRecordsTable)
      .where(eq(sharedRecordsTable.doctorId, userId));
    finalRecordsCount = Number(receivedCount?.count ?? 0);
  }

  res.json({
    medicationsToday: todayReminders.length,
    medicationsTakenToday: takenToday,
    upcomingAppointments: Number(upcomingCount?.count ?? 0),
    totalRecords: finalRecordsCount,
    familyMembers: Number(familyCount?.count ?? 0),
    activeMedications: Number(activeMeds?.count ?? 0),
  });
});

export default router;
