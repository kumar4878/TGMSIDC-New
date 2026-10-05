import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import indentsRouter from "./indents.js";
import vendorsRouter from "./vendors.js";
import institutionsRouter from "./institutions.js";
import equipmentRouter from "./equipment.js";
import rateContractsRouter from "./rate-contracts.js";
import purchaseOrdersRouter from "./purchase-orders.js";
import tendersRouter from "./tenders.js";
import deliveriesRouter from "./deliveries.js";
import dashboardRouter from "./dashboard.js";
import masterDataRouter from "./master-data.js";
import notificationsRouter from "./notifications.js";
import assetReportRouter from "./asset-report.js";

const router = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(indentsRouter);
router.use(vendorsRouter);
router.use(institutionsRouter);
router.use(equipmentRouter);
router.use(rateContractsRouter);
router.use(purchaseOrdersRouter);
router.use(tendersRouter);
router.use(deliveriesRouter);
router.use(dashboardRouter);
router.use(masterDataRouter);
router.use(notificationsRouter);
router.use(assetReportRouter);

export default router;
