import Razorpay from 'razorpay';
import { Wallet } from '../models/wallet.model'; // Import your models
import 'dotenv/config';

// Razorpay client setup
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_API_KEY,
    key_secret: process.env.RAZORPAY_API_SECRET,
});

export const withdrawAmount = async (req, res) => {
    const { userId, amount, bankDetails } = req.body;

    try {
        // 1. Validate input
        if (!userId || !amount || !bankDetails) {
            return res.status(400).json({ error: 'Invalid input' });
        }

        // 2. Check wallet balance
        const wallet = await Wallet.findOne({ user_id: userId });
        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ error: 'Insufficient wallet balance' });
        }

        // 3. Deduct wallet balance (temporary hold)
        wallet.balance -= amount;
        await wallet.save();

        // 4. Create Razorpay Payout
        const payout = await razorpay.payouts.create({
            account_number: 'YOUR_RAZORPAY_ACCOUNT_NUMBER', // Your business account number
            amount: amount * 100, // Razorpay uses paise (multiply by 100)
            currency: 'INR',
            mode: 'IMPS', // IMPS/NEFT/UPI
            purpose: 'refund',
            fund_account: {
                account_type: 'bank_account', // 'upi' for UPI
                bank_account: {
                    name: bankDetails.accountName,
                    ifsc: bankDetails.ifsc,
                    account_number: bankDetails.accountNumber,
                },
            },
            narration: `Wallet Withdrawal for User ${userId}`,
        });

        // 5. Update transaction history
        await Transaction.create({
            user_id: userId,
            type: 'debit',
            amount,
            status: 'successful',
            reason: 'Wallet Withdrawal',
        });

        return res.status(200).json({
            message: 'Withdrawal successful',
            transactionId: payout.id,
        });
    } catch (error) {
        console.error(error);

        // Rollback wallet balance on failure
        if (wallet) {
            wallet.balance += amount;
            await wallet.save();
        }

        // Log failed transaction
        await Transaction.create({
            user_id: userId,
            type: 'debit',
            amount,
            status: 'failed',
            reason: error.message || 'Payout failed',
        });

        return res.status(500).json({ error: 'Withdrawal failed', details: error.message });
    }
};
