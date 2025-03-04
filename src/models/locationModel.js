import mongoose from "mongoose";

const LocationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  zone: String,
});

export const Location = mongoose.model("Location", LocationSchema);
