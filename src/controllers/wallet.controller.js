import Razorpay from "razorpay";
import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import Wallet from "../models/wallet.model.js";
import mongoose from 'mongoose';
import { User } from "../models/user.model.js";

// Razorpay instance configuration
const instance = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_API_SECRET,
});

// Helper function to find or create a wallet
const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = new Wallet({ userId, balance: 0 });
  }
  return wallet;
};

const getWallet = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Validate userId
  if (!userId) {
    throw new ApiError(400, "Invalid userId.");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(400, "User not exists.");
  }

  try {
    const wallet = await getOrCreateWallet(userId);

    return res.status(200).json({
      success: true,
      message: "Wallet retrieved successfully.",
      wallet,
    });
  } catch (error) {
    console.log("Error fetching/creating wallet:", error.message);
    throw new ApiError(400, "Error while fetching/creating wallet.");
  }
})

const createWallet = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  // Validate userId
  if (!userId) {
    throw new ApiError(400, "Invalid userId.");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(400, "User not exists.");
  }

  try {
    const existingWallet = await Wallet.findOne({ userId });

    if (existingWallet) {
      return res.status(400).json({
        success: false,
        message: "Wallet already exists for this user.",
      });
    }

    const wallet = new Wallet({ userId, balance: 0 });
    await wallet.save();

    return res.status(201).json({
      success: true,
      message: "Wallet created successfully.",
      wallet,
    });
  } catch (error) {
    console.error("Error creating wallet:", error.message);
    throw new ApiError(500, "Error while creating wallet.");
  }
});

// Checkout Endpoint
const checkout = asyncHandler(async (req, res) => {
  const { amount } = req.body;

  // Input validation
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    throw new ApiError(400, "Invalid amount. Please provide a positive number.");
  }

  try {
    // Create Razorpay order
    const options = {
      amount: Number(amount) * 100,
      currency: "INR",
    };

    const order = await instance.orders.create(options);

    if (!order || !order.id) {
      throw new ApiError(500, "Failed to create Razorpay order.");
    }

    return res.status(200).json({
      success: true,
      message: "Order created successfully.",
      order,
    });
  } catch (error) {
    console.error("Error during checkout:", error);
    throw new ApiError(500, "Internal server error during checkout.");
  }
});

// Payment Verification Endpoint
const paymentVerification = asyncHandler(async (req, res) => {
  const { userId, amount, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  // Validate required fields
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid or missing userId.");
  }
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    throw new ApiError(400, "Invalid amount. Please provide a positive number.");
  }
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, "Missing required payment fields: orderId, paymentId, signature.");
  }

  try {
    // Generate and compare signatures
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
      .update(body)
      .digest("hex");

    if (razorpay_signature !== expectedSignature) {
      console.error("Invalid payment signature", { razorpay_payment_id, expectedSignature });
      throw new ApiError(400, "Invalid payment signature.");
    }

    // Find or create wallet
    const wallet = await getOrCreateWallet(userId);

    // Add transaction and update balance
    wallet.transactions.push({
      amount: Number(amount),
      type: "credit",
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });
    wallet.balance += Number(amount);

    await wallet.save();

    return res.status(200).json({
      success: true,
      message: "Payment verified and wallet updated successfully.",
      balance: wallet.balance,
      razorpay_payment_id,
    });
  } catch (error) {
    console.error("Error during payment verification:", error);
    throw new ApiError(500, "Internal server error during payment verification.");
  }
});

const paymentVerificationforWithdraw = asyncHandler(async (req, res) => {
  const { userId, amount, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid or missing userId.");
  }
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    throw new ApiError(400, "Invalid amount. Please provide a positive number.");
  }
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, "Missing required payment fields: orderId, paymentId, signature.");
  }

  try {
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
      .update(body)
      .digest("hex");

    if (razorpay_signature !== expectedSignature) {
      console.error("Invalid payment signature", { razorpay_payment_id, expectedSignature });
      throw new ApiError(400, "Invalid payment signature.");
    }

    const wallet = await getOrCreateWallet(userId);
    console.log("Initial wallet balance:", wallet.balance);

    if (wallet.balance < amount) {
      throw new ApiError(400, "Insufficient balance for withdrawal.");
    }

    wallet.transactions.push({
      amount: Number(amount),
      type: "debit",
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    wallet.balance -= Number(amount);
    console.log("Updated wallet balance:", wallet.balance);

    await wallet.save();
    console.log("Wallet saved successfully.");

    return res.status(200).json({
      success: true,
      message: "Payment verified and wallet updated successfully.",
      balance: wallet.balance,
      razorpay_payment_id,
    });
  } catch (error) {
    console.error("Error during payment verification:", error);
    throw new ApiError(500, "Internal server error during payment verification.");
  }
});


// Add Amount to Wallet (Optional Endpoint)
const addAmountToWallet = asyncHandler(async (req, res) => {
  const { userId, amount } = req.body;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid or missing userId.");
  }
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    throw new ApiError(400, "Invalid amount. Please provide a positive number.");
  }

  try {
    // Find or create wallet
    const wallet = await getOrCreateWallet(userId);

    // Update wallet balance
    wallet.balance += Number(amount);

    await wallet.save();

    return res.status(200).json({
      success: true,
      message: "Amount added to wallet successfully.",
      balance: wallet.balance,
    });
  } catch (error) {
    console.error("Error during wallet update:", error);
    throw new ApiError(500, "Internal server error during wallet update.");
  }
});

// Transaction History Endpoint
const getTransactionHistory = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Validate userId
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid or missing userId.");
  }

  try {
    // Find the user's wallet
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      throw new ApiError(404, "Wallet not found.");
    }

    return res.status(200).json({
      success: true,
      message: "Transaction history retrieved successfully.",
      transactions: wallet.transactions,
    });
  } catch (error) {
    console.error("Error during transaction history retrieval:", error);
    throw new ApiError(500, "Internal server error while retrieving transaction history.");
  }
});

// Get Wallet Balance Endpoint
const getBalance = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Validate userId
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid or missing userId.");
  }

  try {
    // Find the user's wallet
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      throw new ApiError(404, "Wallet not found.");
    }

    return res.status(200).json({
      success: true,
      message: "Wallet balance retrieved successfully.",
      balance: wallet.balance,
    });
  } catch (error) {
    console.error("Error during balance retrieval:", error);
    throw new ApiError(500, "Internal server error while retrieving wallet balance.");
  }
});


/*
cellIds are [
  '1/3020122000331', '1/3020122000302', '1/3020122000332',
  '1/3020122000330', '1/3020122000320', '1/3020122000303',
  '1/3020122000301', '1/3020122000313', '1/3020122001003',
  '1/3020122000333', '1/3020121333003', '1/3020122000323',
  '1/3020122000321', '1/3020122000232', '1/3020122000300',
  '1/3020122000310', '1/3020122001010', '1/3020122000312',
  '1/3020122001002', '1/3020122001000', '1/3020121333000',
  '1/3020121333002', '1/3020121333010', '1/3020122000322',
  '1/3020122000012', '1/3020122000231', '1/3020122000233',
  '1/3020122000201', '1/3020122001011', '1/3020122000311',
  '1/3020122001013', '1/3020122000021', '1/3020122001031',
  '1/3020122001001', '1/3020121332333', '1/3020121333001',
  '1/3020121333031', '1/3020121333013', '1/3020121333011',
  '1/3020122000011', '1/3020122000013', '1/3020122000220',
  '1/3020122000230', '1/3020122000202', '1/3020122001322',
  '1/3020122000200', '1/3020122001012', '1/3020122000022',
  '1/3020122001020', '1/3020122000020', '1/3020122001030',
  '1/3020122001032', '1/3020121332332', '1/3020121332330',
  '1/3020121333032', '1/3020121333030', '1/3020121333020',
  '1/3020121333012', '1/3020121333322', '1/3020122000010',
  '1/3020122000002'
]
*/
export { getWallet, createWallet, checkout, paymentVerification, addAmountToWallet, getTransactionHistory, getBalance, paymentVerificationforWithdraw };








// export {  checkout, paymentVerification, addAmountToWallet, getTransactionHistory, getBalance };



// import Razorpay from "razorpay";
// import crypto from "crypto";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import { ApiError } from "../utils/ApiError.js";
// import Wallet from "../models/wallet.model.js";

// // Razorpay instance configuration
// const instance = new Razorpay({
//   key_id: process.env.RAZORPAY_API_KEY,
//   key_secret: process.env.RAZORPAY_API_SECRET,
// });

// // Checkout Endpoint
// const checkout = asyncHandler(async (req, res) => {
//   const { amount } = req.body;

//   // Input validation
//   if (!amount || isNaN(amount) || Number(amount) <= 0) {
//     throw new ApiError(400, "Invalid amount. Please provide a positive number.");
//   }

//   try {
//     // Create Razorpay order
//     const options = {
//       amount: Number(amount) * 100,
//       currency: "INR",
//     };

//     const order = await instance.orders.create(options);

//     if (!order || !order.id) {
//       throw new ApiError(500, "Failed to create Razorpay order.");
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Order created successfully.",
//       order,
//     });
//   } catch (error) {
//     console.error("Error during checkout:", error);
//     throw new ApiError(500, "Internal server error during checkout.");
//   }
// });

// // Payment Verification Endpoint
// const paymentVerification = asyncHandler(async (req, res) => {
//   const { userId, amount, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

//   // Validate required fields
//   if (!userId || !amount || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
//     throw new ApiError(400, "Missing or invalid required fields: userId, amount, orderId, paymentId, signature.");
//   }

//   try {
//     // Generate and compare signatures
//     const body = `${razorpay_order_id}|${razorpay_payment_id}`;
//     const expectedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
//       .update(body)
//       .digest("hex");

//     if (razorpay_signature !== expectedSignature) {
//       console.error("Invalid payment signature", { razorpay_payment_id, expectedSignature });
//       throw new ApiError(400, "Invalid payment signature.");
//     }

//     // Find or create wallet
//     let wallet = await Wallet.findOne({ userId });
//     if (!wallet) {
//       wallet = new Wallet({ userId, balance: 0 });
//     }

//     // Add transaction and update balance
//     wallet.transactions.push({
//       amount: Number(amount),
//       type: "credit",
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//     });
//     wallet.balance += Number(amount);

//     await wallet.save();

//     return res.status(200).json({
//       success: true,
//       message: "Payment verified and wallet updated successfully.",
//       balance: wallet.balance,
//       razorpay_payment_id,
//     });
//   } catch (error) {
//     console.error("Error during payment verification:", error);
//     throw new ApiError(500, "Internal server error during payment verification.");
//   }
// });


// export { checkout, paymentVerification, addAmountToWallet };

