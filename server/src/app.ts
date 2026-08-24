import cors from "cors";
import express, { type Express } from "express";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { apiV1Router } from "./routes";

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.use("/api/v1", apiV1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
