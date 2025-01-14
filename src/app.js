import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import userRouter from './routes/user.routes.js'
import vehicleRoutes from "./routes/vehicle.routes.js"
import walletRoutes from "./routes/wallet.routes.js"
import { getLocation } from "../utils/location.js";
import tripRouter from "./routes/trip.route.js";
import { createServer } from 'http';
import { configureSocket } from "./webSocket.js";
import { transactionMiddleware } from "./middlewares/transaction.middleware.js"
import { ApiError } from "./utils/ApiError.js"

const app = express();

app.use(cors({
    origin: '*',
    credentials: true
}));

const server = createServer(app);

configureSocket(server);


app.use(express.json({ limit: "20mb" }))
app.use(express.urlencoded({ extended: false, limit: "20mb" }))
app.use(express.static("public"))
app.use(cookieParser())

// app.use(transactionMiddleware);

//routes declaration
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/v1/users", userRouter);
app.use("/api/trips", tripRouter);
app.use("/api/wallet", walletRoutes);

app.get("/api/getkey", (req, res) =>
    res.status(200).json({ key: process.env.RAZORPAY_API_KEY })
);


app.post("/api/location", getLocation);

app.get("/api/googleApiKey", (req, res) => { return res.status(200).json(process.env.GOOGLE_MAPS_API_KEY) });

app.use((err, req, res, next) => {

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }
    
    console.error(err.stack);

    res.status(err.status || 500);

    // Send a response with the error message
    res.json({
        success: false,
        message: err.message || 'Internal Server Error',
        // You can include other information like `err.code` or `err.details` if needed
    });
});

export { server }