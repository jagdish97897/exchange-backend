import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    balance: { type: Number, default: 0 },
    transactions: [
      {
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        type: { type: String, enum: ['credit', 'debit'], required: true }, 
        razorpay_order_id: { type: String, required: true },
        razorpay_payment_id: { type: String, required: true },
        razorpay_signature: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Wallet = mongoose.model('Wallet', walletSchema);

export default Wallet;



// import mongoose from "mongoose";

// const walletSchema = new mongoose.Schema(
//     {
//         userId: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "User", 
//             required: true,
//         },
//         amount: {
//             type: String,
//             required: true,
//         },
//         razorpay_order_id: {
//             type: String,
//             required: true,
//         },
//         razorpay_payment_id: {
//             type: String,
//             required: true,
//         },
//         razorpay_signature: {
//             type: String,
//             required: true,
//         },
//     },
//     { timestamps: true }
// );

// const Wallet = mongoose.model("Wallet", walletSchema);

// export { Wallet };
