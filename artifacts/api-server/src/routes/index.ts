import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import leadsRouter from "./leads";
import followupsRouter from "./followups";
import evidenceRouter from "./evidence";
import scansRouter from "./scans";
import instagramRouter from "./instagram";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(leadsRouter);
router.use(followupsRouter);
router.use(evidenceRouter);
router.use(scansRouter);
router.use(instagramRouter);

export default router;
