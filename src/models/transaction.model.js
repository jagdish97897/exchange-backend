import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: true
    },
    trip: {
        type: mongoose.Types.ObjectId,
        ref: 'Trip',
        required: true,
    },
    amount: { type: Number, required: false },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    razorpay_order_id: { type: String, required: false },
    razorpay_payment_id: { type: String, required: false },
    razorpay_signature: { type: String, required: false },
},
    { timestamps: true }
);

export const Transactions = mongoose.model('Transactions', transactionSchema);
