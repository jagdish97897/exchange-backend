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
                min: 0, // Ensure positive values
            },
            reducedQuotePrice: { type: Number },
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
    // Track the sequence of bids
    bids: [
        {
            price: { type: Number, required: true }, // Bid amount
            increasedPrice: { type: Number },
            reducedPrice: { type: Number },
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Who made the bid
            role: { type: String, enum: ["consumer", "driver"], required: true }, // Role of the bidder
            timestamp: { type: Date, default: Date.now }, // When the bid was made
        },
    ],

    // Final agreed price and related details
    finalPrice: {
        type: Number,
        required: false, // Set when the bidding process is complete
    },
    transactions: [
        {
          amount: { type: Number, required: false },
          date: { type: Date, default: Date.now },
          type: { type: String, enum: ['credit', 'debit'], required: true },
          razorpay_order_id: { type: String, required: false },
          razorpay_payment_id: { type: String, required: false },
          razorpay_signature: { type: String, required: false },
        },
      ],


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
