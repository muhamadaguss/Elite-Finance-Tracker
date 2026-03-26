import { Router, type IRouter } from "express";
import healthRouter from "./health";
import transactionsRouter from "./transactions";
import categoriesRouter from "./categories";
import analyticsRouter from "./analytics";
import assetsRouter from "./assets";
import importRouter from "./import";

const router: IRouter = Router();

router.use(healthRouter);
router.use(transactionsRouter);
router.use(categoriesRouter);
router.use(analyticsRouter);
router.use(assetsRouter);
router.use(importRouter);

export default router;
