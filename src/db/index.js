import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

let connection = null;

const connectDB = async () => {
    try {

        if (connection) {
            return connection;
        }

        connection = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log('Database Connected');
    } catch (error) {
        console.log("MONGODB connection FAILED ", error);
        process.exit(1)
    }
}

export default connectDB