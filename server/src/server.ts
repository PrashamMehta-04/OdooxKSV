import { createServer } from "http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { initSocket } from "./socket.js";

const server = createServer(app);
initSocket(server);

server.listen(env.port, () => {
  console.log(`VendorBridge API running on http://localhost:${env.port}`);
});
