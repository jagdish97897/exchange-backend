import express from "express";
import { 
  checkout, 
  paymentVerification, 
  paymentVerificationforWithdraw,
  addAmountToWallet,
  getTransactionHistory,
  getBalance,
  getWallet,
  createWallet
} from "../controllers/wallet.controller.js";

const router = express.Router();

// Route for creating a Razorpay order
router.post("/checkout", checkout);

// Route for verifying Razorpay payment and saving details
router.post("/paymentVerification", paymentVerification);

router.post("/paymentVerificationforWithdraw", paymentVerificationforWithdraw);

// Route for adding an amount to the wallet
router.post("/addAmountToWallet", addAmountToWallet);

// Route for getting transaction history
router.get("/wallet/:userId/transactions", getTransactionHistory);

// Route for getting balance
router.get("/wallet/:userId/balance", getBalance);

// Route for getting or creating a wallet
router.get("/wallet/:userId", getWallet);

// Route for explicitly creating a wallet
router.post("/wallet/create", createWallet);

export default router;
