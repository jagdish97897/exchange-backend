import mongoose, { Schema } from "mongoose";

const vehicleSchema = new Schema(
  {
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (value) {
          // Basic validation for vehicle number format (e.g., "AB12CD3456")
          return /^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/.test(value);
        },
        message: "Invalid vehicle number format",
      },
    },
    rcCopy: {
      type: [String],
      required: false,
      validate: {
        validator: function (value) {
          return value.length > 0;
        },
        message: "At least one RC copy is required",
      },
    },
    height: {
      type: String,
      required: true,
      trim: true,
    },
    width: {
      type: String,
      required: true,
      trim: true,
    },
    length: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    broker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    location: {
      type: { type: String, default: "Point" },
      coordinates: {
        type: [Number], // [longitude, latitude]
        // required: true,
      },
    },
    cellId: { type: String },
    biddingAuthorization: {
      type: String,
      enum: ["owner", "driver", "broker"],
      required: true,
      default: "owner"
    },
    tdsDeclaration: {
      type: [String],
      trim: true,
    },
    ownerConsent: {
      type: [String],
      required: false,
    },
    brokerConsent: {
      type: String,
      required: false,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    }
  },
  {
    timestamps: true,
  }
);

vehicleSchema.index({ location: "2dsphere" });

export const Vehicle = mongoose.model("Vehicle", vehicleSchema);