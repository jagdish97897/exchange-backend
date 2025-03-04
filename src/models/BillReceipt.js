import mongoose from "mongoose";

const BillReceiptSchema = new mongoose.Schema({
  vehicleNumber: { type: String, required: true },
  billFiles: { type: [String], default: [] },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number] } 
  },
  createdAt: { type: Date, default: Date.now }
});

export const BillReceipt = mongoose.model("BillReceipt", BillReceiptSchema);
