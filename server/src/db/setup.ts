import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./client.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(currentDir, "schema.sql");
const schema = await readFile(schemaPath, "utf8");

await db.query(schema);
await db.end();

console.log("VendorBridge database schema is ready.");
