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

    tripDate: {
        type: Date,
        required: true
    },

    cargoDetails: {
        type: {
            cargoType: {
                type: String,
                required: true,
            },
            payloadCost: {
                type: Number,
                required: true,
            },
            payloadWeight: {
                type: Number,
                required: true, // in tonnes
            },
            payloadHeight: {
                type: Number,
                required: false, // in feet
            },
            payloadLength: {
                type: Number,
                required: false, // in feet
            },
            payloadWidth: {
                type: Number,
                required: false, // in feet
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
        enum: ["created", "inProgress", "completed", "cancelled"],
        default: "created", // Default status
        required: true,
    },

    amount: {
        type: Number,
        required: false,
    },
    currentLocation: {
        type: {
            latitude: {
                type: Number,
            },
            longitude: {
                type: Number
            }
        }
    }
});

export const Trip = mongoose.model("Trip", tripSchema);
