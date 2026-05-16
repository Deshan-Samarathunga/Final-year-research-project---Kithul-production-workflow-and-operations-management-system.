import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import type { HelmetOptions } from "helmet";
import { env } from "./env.js";
import { requireAdmin } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { centersRouter } from "./routes/centers.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { employeesRouter } from "./routes/employees.js";
import { fieldCollectionRouter } from "./routes/fieldCollection.js";
import { mobileRouter } from "./routes/mobile.js";
import { systemCansRouter } from "./routes/systemCans.js";
import { errorHandler } from "./utils/http.js";

export function createApp() {
  const app = express();

  type HelmetFactory = (options?: HelmetOptions) => import("express").RequestHandler;
  const helmetFactory =
    (helmet as unknown as { default?: HelmetFactory }).default ?? (helmet as unknown as HelmetFactory);

  app.use(
    helmetFactory({
      crossOriginResourcePolicy: false
    })
  );
  // Mobile API uses permissive CORS (native HTTP clients like Dio
  // don't enforce CORS, but some Android proxy layers may add Origin).
  app.use("/api/mobile", cors());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/mobile", mobileRouter);
  app.use("/api/dashboard", requireAdmin, dashboardRouter);
  app.use("/api/employees", requireAdmin, employeesRouter);
  app.use("/api/centers", requireAdmin, centersRouter);
  app.use("/api/system-cans", requireAdmin, systemCansRouter);
  app.use("/api/field-collection", requireAdmin, fieldCollectionRouter);

  app.use(errorHandler);

  return app;
}
