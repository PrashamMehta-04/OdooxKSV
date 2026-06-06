import "dotenv/config";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://vendorbridge:vendorbridge@localhost:5432/vendorbridge?schema=public",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173"
};
