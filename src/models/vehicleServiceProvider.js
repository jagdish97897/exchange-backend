import mongoose, { Schema } from "mongoose";

// Define the VehicleServiceProvider schema
const vehicleServiceProviderSchema = new Schema(
    {
        aadhar: {
            type: String,
            required: [true, "Aadhar is required"],
            unique: true,
        },
        type: {
            type: String,
            enum: ["owner", "broker"],
            required: true
        },
        phoneNumber: {
            type: Number,
            required: [true, "Phone Number is required"],
            unique: true,
        },
        aadhar: {
            type: String,
            required: [true, "Aadhar is required"],
            unique: true,
        },
        pan: {
            type: String,
            required: [true, "Pan is required"],
            uppercase: true,
            unique: true,
        },
        // References to owners for a broker
        owners: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "VehicleServiceProvider"
        }],
        // References to drivers and brokers for an owner
        drivers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "VehicleServiceProvider",
            required: false
        }],
        brokers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "VehicleServiceProvider",
            required: false
        }]
    },
    {
        timestamps: true
    }
);

// Create a model from the schema
export const VehicleServiceProvider = mongoose.model("VehicleServiceProvider", vehicleServiceProviderSchema);
