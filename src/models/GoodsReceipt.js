import mongoose from "mongoose";

const GoodsReceiptSchema = new mongoose.Schema({
  vehicleNumber: { type: String, required: true },
  grFiles: { type: [String], default: [] },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true }, // Added tripId reference
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number] } 
  },
  createdAt: { type: Date, default: Date.now }
});

export const GoodsReceipt = mongoose.model("GoodsReceipt", GoodsReceiptSchema);


// import mongoose from "mongoose";

// const GoodsReceiptSchema = new mongoose.Schema({
//   vehicleNumber: { type: String, required: true },
//   grFiles: { type: [String], default: [] },
//   driver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   location: {
//     type: { type: String, enum: ["Point"], default: "Point" },
//     coordinates: { type: [Number] } 
//   },
//   createdAt: { type: Date, default: Date.now }
// });

// export const GoodsReceipt = mongoose.model("GoodsReceipt", GoodsReceiptSchema);
