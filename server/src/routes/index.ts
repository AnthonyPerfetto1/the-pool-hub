import { Router } from "express";
import { authRouter } from "./auth";
import { customersRouter } from "./customers";
import { dashboardRouter } from "./dashboard";
import { healthRouter } from "./health";
import { ordersRouter } from "./orders";
import { profileRouter } from "./profile";
import { transactionsRouter } from "./transactions";

export const apiV1Router = Router();

apiV1Router.use(healthRouter);
apiV1Router.use(authRouter);
apiV1Router.use(profileRouter);
apiV1Router.use(customersRouter);
apiV1Router.use(ordersRouter);
apiV1Router.use(transactionsRouter);
apiV1Router.use(dashboardRouter);
