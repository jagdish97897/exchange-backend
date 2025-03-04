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
            quotePrice: {
                type: Number,
                required: true,
                min: 0, 
            },
            reducedQuotePrice: { type: Number },
            payloadWeight: {
                type: Number,
                required: true, 
                min: 0, 
            },
            payloadHeight: {
                type: Number,
                required: false, 
            },
            payloadLength: {
                type: Number,
                required: false, 
            },
            payloadWidth: {
                type: Number,
                required: false, 
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
            increasedCounterPrice: { type: Number },
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
        }
    ],
    bids: [
        {
            price: { type: Number, required: true }, 
            increasedPrice: { type: Number },
            reducedPrice: { type: Number },
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            role: { type: String, enum: ["consumer", "driver"], required: true },
            timestamp: { type: Date, default: Date.now }, 
        },
    ],
    // Final agreed price and related details
    finalPrice: {
        type: Number,
        required: false, 
    },
    grAccepted: { type: Boolean, default: false },
    billAccepted: { type: Boolean, default: false },

    // Status of the bidding process
    biddingStatus: {
        type: String,
        enum: ["notStarted", "inProgress", "accepted", "rejected"],
        default: "notStarted",
    },

    biddingStartTime: {
        type: Date,
        default: new Date()
    },

    bidder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }
},
    { timestamps: true }
);

tripSchema.pre("save", function (next) {
    // Calculate reducedQuotePrice for cargoDetails
    if (this.cargoDetails && this.cargoDetails.quotePrice) {
        this.cargoDetails.reducedQuotePrice = this.cargoDetails.quotePrice - (10 / 100) * this.cargoDetails.quotePrice;
    }

    // Calculate increasedCounterPrice for each counterPriceList item
    this.counterPriceList.forEach((item) => {
        if (item.counterPrice) {
            item.increasedCounterPrice = item.counterPrice + (10 / 100) * item.counterPrice;
        }
    });

    // Calculate reduced and increased prices for bids
    this.bids.forEach((bid) => {
        if (bid.price) {
            bid.reducedPrice = bid.price - (10 / 100) * bid.price;
            bid.increasedPrice = bid.price + (10 / 100) * bid.price;
        }
    });

    next();
});

tripSchema.index({ tripDate: 1 });

export const Trip = mongoose.model("Trip", tripSchema);
