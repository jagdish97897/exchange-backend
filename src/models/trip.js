import mongoose, { Schema } from "mongoose";

const tripSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    from: {
        type: String,
        required: true,
    },

    to: {
        type: String,
        required: true,
    },

    cargoDetails: {
        type: {
            cargoType: {
                type: String,
                required: true, // Specify if this is mandatory
            },
            payloadCost: {
                type: Number,
                required: true, // Specify if this is mandatory
            },
            payloadWeight: {
                type: Number,
                required: true, // Specify if this is mandatory
            },
            payloadHeight: {
                type: Number,
                required: false, // Optional
            },
            payloadLength: {
                type: Number,
                required: false, // Optional
            },
            payloadWidth: {
                type: Number,
                required: false, // Optional
            },
        },
        required: true,
    },

    specialInstruction: {
        type: String,
        required: false,
    },

    status: {
        type: String,
        enum: ["inactive", "active", "started", "not started"],
        default: "inactive", // Default status
        required: true,
    },

    amount: {
        type: Number,
        required: false,
    },
});

export const Trip = mongoose.model("Trip", tripSchema);
