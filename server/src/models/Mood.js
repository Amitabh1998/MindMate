import mongoose from "mongoose";

const MoodSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    label: { type: String, enum: ["Happy", "Content", "Neutral", "Stressed", "Sad"], required: true },
    value: { type: Number, min: 1, max: 5, required: true },  // 1..5
    level: { type: Number, min: 0, max: 100, default: 50 },   // slider 0..100
  },
  { timestamps: true }
);

// Fast lookups by user & time
MoodSchema.index({ userId: 1, createdAt: 1 });

export default mongoose.model("Mood", MoodSchema);
