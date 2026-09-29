import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { logger } from "./lib/logger.js";

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "Unhandled Rejection caught by process handler");
});

process.on("uncaughtException", (error) => {
  logger.error({ error }, "Uncaught Exception caught by process handler");
});

const rawPort = process.env.PORT;
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await connectDB();

app.listen(port, () => {
  logger.info({ port }, "Server listening");
});
