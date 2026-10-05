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

// Realistic processing simulation delay (2 to 3 seconds) for all data-saving operations (POST, PUT, PATCH, DELETE)
app.use((req, _res, next) => {
  const isSaveOperation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  const isAuth = req.path.startsWith("/auth") || req.originalUrl?.includes("/auth");

  if (isSaveOperation && !isAuth) {
    // 2.0 to 2.8 seconds realistic processing time lag
    const delayMs = 2000 + Math.floor(Math.random() * 800);
    setTimeout(next, delayMs);
  } else {
    next();
  }
});

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
