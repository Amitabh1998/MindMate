// server/src/routes/ai.js
import express from "express";
import { auth } from "../middleware/auth.js";
import Conversation from "../models/Conversation.js";
import Goal from "../models/Goal.js";
import Mood from "../models/Mood.js";

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const router = express.Router();

/* ---------------- Feature flags / Env ---------------- */
const RECS_DISABLE_AI_IMAGES =
  String(process.env.RECS_DISABLE_AI_IMAGES || "").toLowerCase() === "true";

/* ---------------- OpenAI (lazy, used for chat only) ---------------- */
let openai = null;
if (process.env.OPENAI_API_KEY) {
  try {
    const { default: OpenAI } = await import("openai");
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log("AI assistant: OpenAI enabled (chat)");
  } catch (e) {
    console.warn("AI assistant: failed to load OpenAI SDK for chat. Run `npm i openai` to enable.");
  }
}

/* ---------------- Paths (kept for compatibility) ---------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// If you ever re-enable AI images, server/src/index.js serves: /static -> server/static
const STATIC_BASE_DIR = path.join(__dirname, "..", "static");
const STATIC_RECS_DIR = path.join(STATIC_BASE_DIR, "recs");

/* ---------------- Utilities ---------------- */
function looksLikeCrisis(text = "") {
  return /suicide|kill myself|end my life|self[-\s]?harm|hurt myself/i.test(text);
}

async function persistPair(userId, userText, assistantText) {
  if (!userText) return;
  const limit = Number(process.env.ASSISTANT_HISTORY_LIMIT || 100);
  await Conversation.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: { userId },
      $push: {
        messages: {
          $each: [
            { role: "user", content: userText, at: new Date() },
            { role: "assistant", content: assistantText, at: new Date() },
          ],
          $slice: -limit,
        },
      },
    },
    { upsert: true }
  );
}

function round(n, d = 1) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function mode(arr = []) {
  const m = new Map();
  for (const x of arr) m.set(x, (m.get(x) || 0) + 1);
  let best = null,
    max = 0;
  for (const [k, v] of m) if (v > max) (max = v), (best = k);
  return best;
}

/* -------- Card → category / fallback image -------- */
function cardCategory(card) {
  const t = (card.to || "").toLowerCase();
  const title = (card.title || "").toLowerCase();
  if (t.includes("/meditate") || /breathe|breath|meditat/.test(title)) return "meditate";
  if (t.includes("/goals") || /goal|nudge|step|progress/.test(title)) return "goals";
  if (t.includes("/schedule") || /support|therapy|session|talk/.test(title)) return "schedule";
  return "checkin";
}

// Fallback SVGs hosted by the client (public/recs/*.svg)
function fallbackSvg(category) {
  switch (category) {
    case "meditate":
      return "/recs/breathe-meditate.svg";
    case "goals":
      return "/recs/goals-nudge.svg";
    case "schedule":
      return "/recs/schedule-support.svg";
    default:
      return "/recs/daily-checkin.svg";
  }
}

/**
 * Ensure an image URL for a recommendation card.
 * With RECS_DISABLE_AI_IMAGES=true we ALWAYS return the client SVG fallback.
 * (AI generation path retained for future, but currently short-circuited.)
 */
async function ensureImageURL(req, card) {
  const category = cardCategory(card);

  // Force SVG fallback (your request)
  if (RECS_DISABLE_AI_IMAGES) return fallbackSvg(category);

  // --- The below is kept for future flexibility; currently unreachable with the flag on.
  const hash = crypto
    .createHash("sha1")
    .update(JSON.stringify({ category, title: card.title, blurb: card.blurb }))
    .digest("hex")
    .slice(0, 16);

  const filename = `${category}-${hash}.png`;
  const outPath = path.join(STATIC_RECS_DIR, filename);
  const absoluteUrl = `${req.protocol}://${req.get("host")}/static/recs/${filename}`;

  try {
    await fs.mkdir(STATIC_RECS_DIR, { recursive: true });
    await fs.access(outPath).then(() => absoluteUrl);
  } catch {
    // ignore; fall through
  }

  // If we ever re-enable generation but OpenAI is not available, still fallback:
  return fallbackSvg(category);
}

/* ---------------- Routes: History ---------------- */
router.get("/history", auth, async (req, res) => {
  const conv = await Conversation.findOne({ userId: req.userId }).lean();
  return res.json({ messages: conv?.messages ?? [] });
});

/* ---------------- Routes: Chat (non-stream) ---------------- */
router.post("/chat", auth, async (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  if (!messages.length) return res.status(400).json({ message: "messages must be a non-empty array" });

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";

  // Crisis response
  if (looksLikeCrisis(lastUserMsg)) {
    const reply =
      "I’m really glad you reached out. Your safety matters. If you’re in immediate danger, call your local emergency number now.\n\n" +
      "You can also contact a crisis line:\n• India: 9152987821 (AASRA)\n• US/Canada: 988 (Suicide & Crisis Lifeline)\n• UK & ROI: Samaritans 116 123\n\n" +
      "If you’d like, we can take a few slow breaths together. I’m here with you.";
    await persistPair(req.userId, lastUserMsg, reply);
    return res.json({ reply });
  }

  // Fallback if OpenAI is unavailable
  if (!openai) {
    const reply =
      "Thanks for sharing. Try a gentle 4–4 rhythm: inhale 4s, exhale 4s, for 5 rounds. If you’d like, tell me a little more about what’s on your mind.";
    await persistPair(req.userId, lastUserMsg, reply);
    return res.json({ reply });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You are a kind, supportive, non-clinical mental wellness assistant. Be brief, practical, and gentle. Avoid diagnosis. Encourage professional help for crises.",
        },
        ...messages,
      ],
    });
    const reply = completion.choices?.[0]?.message?.content?.trim() || "";
    await persistPair(req.userId, lastUserMsg, reply);
    return res.json({ reply });
  } catch (e) {
    console.error("AI chat error:", e?.message || e);
    const reply =
      "I had trouble generating a response. Let’s try a grounding exercise: name 5 things you see, 4 you feel, 3 you hear, 2 you smell, and 1 you taste.";
    await persistPair(req.userId, lastUserMsg, reply);
    return res.json({ reply });
  }
});

/* ---------------- Routes: Chat (SSE streaming) ---------------- */
router.post("/chat/stream", auth, async (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  if (!messages.length) return res.status(400).json({ message: "messages must be a non-empty array" });

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (data) => res.write(`data: ${data}\n\n`);
  const done = () => {
    res.write("data: [DONE]\n\n");
    res.end();
  };

  // Crisis/fallback immediate
  if (looksLikeCrisis(lastUserMsg)) {
    const reply =
      "I’m really glad you reached out. Your safety matters. If you’re in immediate danger, call your local emergency number now.\n\n" +
      "You can also contact a crisis line:\n• India: 9152987821 (AASRA)\n• US/Canada: 988 (Suicide & Crisis Lifeline)\n• UK & ROI: Samaritans 116 123\n\n" +
      "If you’d like, we can take a few slow breaths together. I’m here with you.";
    send(reply);
    await persistPair(req.userId, lastUserMsg, reply);
    return done();
  }
  if (!openai) {
    const reply =
      "Thanks for sharing. Try a gentle 4–4 rhythm: inhale 4s, exhale 4s, for 5 rounds. If you’d like, tell me a little more about what’s on your mind.";
    send(reply);
    await persistPair(req.userId, lastUserMsg, reply);
    return done();
  }

  try {
    let full = "";
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      stream: true,
      messages: [
        {
          role: "system",
          content:
            "You are a kind, supportive, non-clinical mental wellness assistant. Be brief, practical, and gentle. Avoid diagnosis. Encourage professional help for crises.",
        },
        ...messages,
      ],
    });

    for await (const part of stream) {
      const token = part?.choices?.[0]?.delta?.content || "";
      if (token) {
        full += token;
        send(token); // don't trim; client preserves spaces/newlines
      }
    }
    await persistPair(req.userId, lastUserMsg, full);
    return done();
  } catch (e) {
    console.error("AI stream error:", e?.message || e);
    send("I’m having trouble responding right now. Let’s try a short breathing break together.");
    return done();
  }
});

/* ---------------- Routes: Recommendations ---------------- */
router.post("/recommendations", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const labelFromClient = req.body?.label;
    const levelFromClient = Number.isFinite(+req.body?.level) ? +req.body.level : undefined;

    const now = new Date();
    const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Mood stats (30d + last7)
    const moods = await Mood.find({ userId, createdAt: { $gte: since30 } })
      .sort({ createdAt: 1 })
      .lean();
    const values = moods.map((m) => Number(m.value) || 0).filter(Boolean);
    const labels = moods.map((m) => m.label).filter(Boolean);
    const latest = moods[moods.length - 1] || null;

    const avg = values.length ? round(values.reduce((a, b) => a + b, 0) / values.length, 2) : null;
    const last7Vals = moods
      .filter((m) => m.createdAt >= since7)
      .map((m) => Number(m.value) || 0)
      .filter(Boolean);
    const last7Avg = last7Vals.length ? round(last7Vals.reduce((a, b) => a + b, 0) / last7Vals.length, 2) : null;
    const commonLabel = mode(labels);

    // Goals snapshot
    const goals = await Goal.find({ userId }).sort({ createdAt: -1 }).lean();
    const active = goals.filter((g) => !g.completedAt);
    const overdue = active.filter((g) => g.dueAt && new Date(g.dueAt) < now);
    const lowProgress = active.filter((g) => (g.progress ?? 0) < 40);

    // Recent user messages (last 5)
    const conv = await Conversation.findOne({ userId }).lean();
    const recentUserMsgs = (conv?.messages || [])
      .filter((m) => m.role === "user")
      .slice(-5)
      .map((m) => m.content);

    const context = {
      mood: {
        avg,
        last7Avg,
        latest: latest ? { label: latest.label, value: latest.value, level: latest.level } : null,
        commonLabel,
        currentLabel: labelFromClient || latest?.label || commonLabel || "Neutral",
        currentLevel: typeof levelFromClient === "number" ? levelFromClient : latest?.level ?? null,
      },
      goals: active.map((g) => ({ title: g.title, progress: g.progress ?? 0, dueAt: g.dueAt })),
      stats: {
        totalGoals: goals.length,
        activeGoals: active.length,
        overdueCount: overdue.length,
        lowProgressCount: lowProgress.length,
      },
      recentConcerns: recentUserMsgs,
    };

    // Heuristic recommendation cards (3 max)
    const items = (() => {
      const label = context.mood.currentLabel;
      const level = Number(context.mood.currentLevel ?? 50);
      const overdueCount = context.stats.overdueCount || 0;
      const lowCount = context.stats.lowProgressCount || 0;

      const cards = [];
      const trendingDown =
        context.mood.last7Avg !== null &&
        context.mood.avg !== null &&
        context.mood.last7Avg < context.mood.avg - 0.2;

      if (label === "Stressed" || label === "Sad" || trendingDown || level >= 70) {
        cards.push({
          title: "Breathe & Meditate",
          blurb: "A 3–5 minute calming breath to steady your mood.",
          to: "/meditate",
        });
      } else {
        cards.push({
          title: "Mindful Breathing",
          blurb: "A short 4–4 rhythm to refresh your focus.",
          to: "/meditate",
        });
      }

      if (overdueCount > 0 || lowCount > 0) {
        cards.push({
          title: "Nudge a Stuck Goal",
          blurb: "Pick one tiny action and move the bar by 5–10%.",
          to: "/goals",
        });
      } else {
        cards.push({
          title: "Tiny Step Goal",
          blurb: "Capture a 2-minute action that supports your current mood.",
          to: "/goals",
        });
      }

      const concernsText = (context.recentConcerns || []).join(" ").toLowerCase();
      const looksHeavy =
        label === "Stressed" ||
        label === "Sad" ||
        /burnout|overwhelmed|anxiety|panic|sleep|can[’']?t cope/.test(concernsText);
      cards.push(
        looksHeavy || level >= 80
          ? { title: "Schedule Some Support", blurb: "Book time to talk it through.", to: "/schedule" }
          : { title: "Daily Check-in", blurb: "Review your trend and celebrate a win.", to: "/dashboard" }
      );

      return cards.slice(0, 3);
    })();

    // Attach images (forced SVG fallback)
    const withImages = await Promise.all(
      items.map(async (c) => ({
        ...c,
        img: await ensureImageURL(req, c), // returns /recs/*.svg with the flag on
      }))
    );

    return res.json({ items: withImages });
  } catch (e) {
    console.error("recommendations error:", e?.message || e);
    // Safe fallback
    const items = ["meditate", "goals", "schedule"].map((cat) => ({
      title:
        const title = cat === "meditate" ? "Mindful Breathing" : cat === "goals" ? "Tiny Step Goal" : "Schedule Some Support";
      title,
      blurb:
        cat === "meditate"
          ? "A short 4–4 rhythm to refresh your focus."
          : cat === "goals"
          ? "Capture a 2-minute action that supports your mood."
          : "Book time to talk it through.",
      to: cat === "schedule" ? "/schedule" : cat === "goals" ? "/goals" : "/meditate",
      img: fallbackSvg(cat),
    }));
    return res.json({ items });
  }
});

export default router;
