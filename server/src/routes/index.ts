import { Router } from "express";
import { healthRouter } from "./health";

export const apiV1Router = Router();

apiV1Router.use(healthRouter);
