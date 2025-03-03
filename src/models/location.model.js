import mongoose from "mongoose";

const LocationSchema = new mongoose.Schema(
  {// only driver latitude longitude are present 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    zone: { type: String },
    cellId: { type: String },
  },
  { timestamps: true }
);

LocationSchema.index({ cellId: 1 });

export const Location = mongoose.model("Location", LocationSchema);
