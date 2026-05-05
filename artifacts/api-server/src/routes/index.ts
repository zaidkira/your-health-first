import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import medicationsRouter from "./medications";
import recordsRouter from "./records";
import doctorsRouter from "./doctors";
import appointmentsRouter from "./appointments";
import pharmaciesRouter from "./pharmacies";
import familyRouter from "./family";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(medicationsRouter);
router.use(recordsRouter);
router.use(doctorsRouter);
router.use(appointmentsRouter);
router.use(pharmaciesRouter);
router.use(familyRouter);

export default router;
