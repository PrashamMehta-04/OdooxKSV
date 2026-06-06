import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { authRouter } from "./auth/auth.routes.js";
import { env } from "./config/env.js";
import { dashboardRouter } from "./dashboard/dashboard.routes.js";
import { apiRouteMap } from "./domain/api-route-map.js";

import { vendorsRouter } from "./vendors/vendors.routes.js";
import { rfqsRouter } from "./rfqs/rfqs.routes.js";
import { quotationsRouter } from "./quotations/quotations.routes.js";
import { approvalsRouter } from "./approvals/approvals.routes.js";
import { posRouter } from "./pos/pos.routes.js";
import { invoicesRouter } from "./invoices/invoices.routes.js";
import { activityRouter } from "./activity/activity.routes.js";

export const app = express();

function isAllowedOrigin(origin: string) {
  if (env.clientOrigins.includes(origin)) {
    return true;
  }

  return env.nodeEnv !== "production" && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by VendorBridge CORS."));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "vendorbridge-api",
    database: "postgres",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/meta/routes", (_req, res) => {
  res.json({ routes: apiRouteMap });
});

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/vendors", vendorsRouter);
app.use("/api/rfqs", rfqsRouter);
app.use("/api/quotations", quotationsRouter);
app.use("/api/approvals", approvalsRouter);
app.use("/api/pos", posRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/activity", activityRouter);
