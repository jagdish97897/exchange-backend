import express from "express";
import { 
  checkout, 
  paymentVerification, 
  addAmountToWallet,
  getTransactionHistory,
  getBalance
} from "../controllers/wallet.controller.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import Wallet from "../models/wallet.model.js";
import mongoose from "mongoose";

const router = express.Router();

// Route for creating a Razorpay order
router.post("/checkout", checkout);

// Route for verifying Razorpay payment and saving details
router.post("/paymentVerification", paymentVerification);

// Route for adding an amount to the wallet
router.post("/addAmountToWallet", addAmountToWallet);

// Route for getting transaction history
router.get("/wallet/:userId/transactions", getTransactionHistory);

// Route for getting balance
router.get("/wallet/:userId/balance", getBalance);

// Helper function to find or create a wallet
const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = new Wallet({ userId, balance: 0 });
    await wallet.save();
  }
  return wallet;
};

// Route for getting or creating a wallet
router.get(
  "/wallet/:userId",
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid userId.");
    }

    try {
      const wallet = await getOrCreateWallet(userId);

      return res.status(200).json({
        success: true,
        message: "Wallet retrieved successfully.",
        wallet,
      });
    } catch (error) {
      console.error("Error fetching/creating wallet:", error);
      throw new ApiError(500, "Internal server error while fetching/creating wallet.");
    }
  })
);

// Route for explicitly creating a wallet
router.post(
  "/wallet/create",
  asyncHandler(async (req, res) => {
    const { userId } = req.body;

    // Validate userId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid or missing userId.");
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
      console.error("Error creating wallet:", error);
      throw new ApiError(500, "Internal server error while creating wallet.");
    }
  })
);

export default router;


// import express from "express";
// import { 
//   checkout, 
//   paymentVerification, 
//   addAmountToWallet,
//   getTransactionHistory,
//   getBalance
// } from "../controllers/wallet.controller.js";

// import { asyncHandler } from "../utils/asyncHandler.js";
// import { ApiError } from "../utils/ApiError.js";
// import Wallet from "../models/wallet.model.js";
// import mongoose from "mongoose";

// const router = express.Router();

// // Route for creating a Razorpay order
// router.post("/checkout", checkout);

// // Route for verifying Razorpay payment and saving details
// router.post("/paymentVerification", paymentVerification);

// // Route for adding an amount to the wallet
// router.post("/addAmountToWallet", addAmountToWallet);

// router.get("/wallet/:userId/transactions", getTransactionHistory);

// router.get("/wallet/:userId/balance", getBalance);

// // Helper function to find or create a wallet
// const getOrCreateWallet = async (userId) => {
//   let wallet = await Wallet.findOne({ userId });
//   if (!wallet) {
//     wallet = new Wallet({ userId, balance: 0 });
//     await wallet.save();
//   }
//   return wallet;
// };

// // Route for getting or creating a wallet
// router.get(
//   "/wallet/:userId",
//   asyncHandler(async (req, res) => {
//     const { userId } = req.params;

//     // Validate userId
//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       throw new ApiError(400, "Invalid userId.");
//     }

//     try {
//       const wallet = await getOrCreateWallet(userId);

//       return res.status(200).json({
//         success: true,
//         message: "Wallet retrieved successfully.",
//         wallet,
//       });
//     } catch (error) {
//       console.error("Error fetching/creating wallet:", error);
//       throw new ApiError(500, "Internal server error while fetching/creating wallet.");
//     }
//   })
// );

// export default router;


// import express from "express";
// import { checkout, paymentVerification, addAmountToWallet } from "../controllers/wallet.controller.js";

// const router = express.Router();

// // Route for creating a Razorpay order
// router.post("/checkout", checkout);

// // Route for verifying Razorpay payment and saving details
// router.post("/paymentVerification", paymentVerification);

// router.post("/addAmountToWallet", addAmountToWallet);

// export default router;
