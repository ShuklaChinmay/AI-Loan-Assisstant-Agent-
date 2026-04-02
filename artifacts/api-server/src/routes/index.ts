import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import loansRouter from "./loans.js";
import chatRouter from "./chat.js";
import adminRouter from "./admin.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(loansRouter);
router.use(chatRouter);
router.use(adminRouter);

export default router;
