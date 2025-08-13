// server/src/routes/goals.js
import express from "express";
import { auth } from "../middleware/auth.js";
import Goal from "../models/Goal.js";

const router = express.Router();

// GET /api/goals -> list current user's goals
router.get("/", auth, async (req, res) => {
  const goals = await Goal.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
  res.json({ goals });
});

// POST /api/goals -> create a goal
// body: { title: string, dueAt?: string | null }
router.post("/", auth, async (req, res) => {
  const { title, dueAt } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ message: "Title is required" });

  const goal = await Goal.create({
    userId: req.userId,
    title: title.trim(),
    dueAt: dueAt ? new Date(dueAt) : null,
  });
  res.status(201).json({ goal });
});

// PATCH /api/goals/:id -> update fields (title, progress, dueAt, completedAt)
router.patch("/:id", auth, async (req, res) => {
  const { id } = req.params;
  const { title, progress, dueAt, completed } = req.body || {};

  const update = {};
  if (typeof title === "string") update.title = title.trim();
  if (Number.isFinite(progress)) update.progress = Math.max(0, Math.min(100, Math.round(progress)));
  if (dueAt !== undefined) update.dueAt = dueAt ? new Date(dueAt) : null;

  // toggle completed state if provided
  if (typeof completed === "boolean") {
    update.completedAt = completed ? new Date() : null;
    if (completed) update.progress = 100;
  }

  const goal = await Goal.findOneAndUpdate({ _id: id, userId: req.userId }, { $set: update }, { new: true });
  if (!goal) return res.status(404).json({ message: "Goal not found" });
  res.json({ goal });
});

// DELETE /api/goals/:id -> remove
router.delete("/:id", auth, async (req, res) => {
  const { id } = req.params;
  const ok = await Goal.findOneAndDelete({ _id: id, userId: req.userId });
  if (!ok) return res.status(404).json({ message: "Goal not found" });
  res.json({ ok: true });
});

export default router;
