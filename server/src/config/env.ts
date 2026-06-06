import "dotenv/config";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://vendorbridge:vendorbridge@localhost:5432/vendorbridge?schema=public",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  clientOrigins: (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  jwtAccessSecret:
    process.env.JWT_ACCESS_SECRET ?? "vendorbridge-local-access-secret-change-before-production",
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET ?? "vendorbridge-local-refresh-secret-change-before-production",
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? "7d"
};
