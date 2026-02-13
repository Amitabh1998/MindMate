// server/src/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import aiRoutes from "./routes/ai.js";
import moodRoutes from "./routes/moods.js";      // save/fetch moods
import goalsRoutes from "./routes/goals.js";     // set/update goals
import moodsRoutes from "./routes/moods.js";

// ...existing middleware & routes...


const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 8080;
const origin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

/* ---------- middleware ---------- */
app.use(
  cors({
    origin,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

/* Serve cached/generated images (AI recs) from server/static */
app.use(
  "/static",
  express.static(path.join(__dirname, "..", "static"), { maxAge: "7d" })
);

/* ---------- health ---------- */
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, origin, ts: new Date().toISOString() })
);

/* ---------- routes ---------- */
app.use("/api/auth", authRoutes);
app.use("/api/assistant", aiRoutes);
app.use("/api/moods", moodRoutes);
app.use("/api/goals", goalsRoutes);
// app.use("/api/debug", debugRoutes);
app.use("/api/moods", moodsRoutes);

/* 404 for unknown API routes */
app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));

/* Basic error handler (keeps JSON shape consistent) */
app.use((err, _req, res) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Server error" });
});

/* ---------- boot ---------- */
connectDB(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
      console.log(`CORS origin: ${origin}`);
    });
  })
  .catch((err) => {
    console.error("Mongo connection failed:", err.message);
    process.exit(1);
  });
