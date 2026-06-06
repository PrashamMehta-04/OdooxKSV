import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { apiRouteMap } from "./domain/api-route-map.js";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
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
