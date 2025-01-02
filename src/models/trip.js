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
                min: 0, // Ensure positive values
            },
            payloadWeight: {
                type: Number,
                required: true, // in tonnes
                min: 0, // Ensure positive values
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
        default: "created", 
        required: true,
    },
    amount: {
        type: Number,
        required: false,
    },
    currentLocation: {
        type: {
            latitude: { type: Number, default: 0 },
            longitude: { type: Number, default: 0 },
        },
        required: false, 
    },
    counterPriceList: [
        {
            counterPrice: { type: Number },
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
        }
    ],
    RevisedPrice: {
        type: {
            counterPrice: { type: Number },
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        },
    }
});

tripSchema.index({ tripDate: 1 });

export const Trip = mongoose.model("Trip", tripSchema);


// consumer -> quote price  :: driver -> Counter Price ,
// consumer -> rebid price :: driver -> Revised Price