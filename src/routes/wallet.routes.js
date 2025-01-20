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


const generateWalletCardNumber = async () => {
  let cardNumber;
  let exists = true;

  do {
    cardNumber = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    exists = await Wallet.findOne({ walletCardNumber: cardNumber });
  } while (exists);

  return cardNumber;
};


const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    const walletCardNumber = await generateWalletCardNumber(); // Generate the card number
    wallet = new Wallet({ userId, balance: 0, walletCardNumber });
    await wallet.save();
  }
  return wallet;
};


// Route for getting or creating a wallet
router.get("/wallet/:userId", getWallet);

// Route for explicitly creating a wallet
router.post("/wallet/create", createWallet);

export default router;
