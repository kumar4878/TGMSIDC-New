import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  })
);
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/api", router);

app.use((err: any, _req: any, res: any, _next: any) => {
  if (err?.name === "CastError" || err?.name === "BSONError") {
    res.status(404).json({ error: "Resource not found" });
    return;
  }
  logger.error(err);
  res.status(500).json({ error: err?.message || "Internal server error" });
});

export default app;
