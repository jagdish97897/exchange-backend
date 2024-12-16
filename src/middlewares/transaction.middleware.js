import mongoose from "mongoose";

const transactionMiddleware = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    req.session = session; // Attach the session to the request object
    req.commitTransaction = async () => {
        await session.commitTransaction();
        session.endSession();
    };
    req.abortTransaction = async () => {
        await session.abortTransaction();
        session.endSession();
    };

    next();
};


// const mongoose = require('mongoose');

// const withTransaction = async (callback) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const result = await callback(session);
//     await session.commitTransaction();
//     session.endSession();
//     return result;
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     throw error;
//   }
// };

// module.exports = withTransaction;


export { transactionMiddleware };
