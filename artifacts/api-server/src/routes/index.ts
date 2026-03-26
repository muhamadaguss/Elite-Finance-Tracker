import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import healthRouter from "./health";
import authRouter from "./auth";
import transactionsRouter from "./transactions";
import categoriesRouter from "./categories";
import analyticsRouter from "./analytics";
import assetsRouter from "./assets";
import importRouter from "./import";
import receiptRouter from "./receipt";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);

router.use(requireAuth);
router.use(transactionsRouter);
router.use(categoriesRouter);
router.use(analyticsRouter);
router.use(assetsRouter);
router.use(importRouter);
router.use(receiptRouter);

export default router;
