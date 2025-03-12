
import { User } from "../models/user.model.js";
import { validateFields } from "./user.controller.js";
import axios from "axios";
import { Vehicle } from "../models/vehicle.model.js";
import { server } from '../app.js';
import { emitNewMessage, configureSocket } from "../webSocket.js";
import cron from 'node-cron';
import crypto from "crypto";
import mongoose from "mongoose";
import Wallet from "../models/wallet.model.js";
import { Trip } from "../models/trip.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { S2 } from "s2-geometry";
import { Location } from "../models/location.model.js";
import { Transactions } from "../models/transaction.model.js";
import { TripNotification } from "../models/trip_notification.model.js";



const paymentVerificationForTrip = asyncHandler(async (req, res) => {
    const { userId, tripId, amount, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

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

        // Find the Trip document
        // console.log(`Searching for trip with ID: ${tripId}`);
        const [trip, user] = await Promise.all([Trip.findById(tripId), User.findById(userId)]);

        if (!trip) {
            console.error(`Trip not found for tripId: ${tripId}`);
            throw new ApiError(404, "Trip not found.");
        }

        if (!user) {
            console.error(`User not found for userId: ${userId}`);
            throw new ApiError(404, "User not found.");
        }

        // Check if finalPrice exists
        if (!trip.finalPrice || trip.finalPrice <= 0) {
            throw new ApiError(400, "Final price is not set for this trip.");
        }

        const paymentPercent = (amount / trip.finalPrice) * 100;

        // Add transaction without modifying the finalPrice
        await Transactions.create({
            user,
            trip,
            paymentPercent,
            amount: Number(amount),
            type: "credit",
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        });

        trip.status = "inProgress";

        // Save the updated Trip document
        await trip.save();

        return res.status(200).json({
            success: true,
            message: "Payment verified and trip transaction updated successfully.",
            transactions: trip.transactions,
            remainingFinalPrice: trip.finalPrice,
        });
    } catch (error) {
        console.error("Error during payment verification:", error);
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Internal server error during payment verification."
        );
    }
});


const getDistance = asyncHandler(async (req, res) => {
    const { to, from } = req.query;

    // console.log(to, from);
    const response = await axios.get(
        `https://maps.googleapis.com/maps/api/distancematrix/json`,
        {
            params: {
                origins: from,
                destinations: to,
                key: process.env.GOOGLE_MAPS_API_KEY
            }
        }
    );
    // console.log(response);
    if (!response) {
        throw new Error('Invalid pincode');
    }

    // Extract distance information
    const distanceInfo = response?.data?.rows[0]?.elements[0];
    const distance = distanceInfo?.distance?.text;
    // console.log('distance : ', distance);
    return res.status(200).json({ success: true, distance });
});

const createTrip = asyncHandler(async (req, res) => {
    try {

        const { from, to, phoneNumber, tripDate, cargoDetails, specialInstruction, currentLocation } = req.body;

        validateFields([from, to, phoneNumber]);

        const user = await User.findOne({ phoneNumber });

        if (!user) {
            throw new ApiError(400, 'User not found');
        }

        const trip = await Trip.create({
            user,
            from,
            to,
            tripDate: tripDate || new Date(),
            cargoDetails,
            specialInstruction,
            status: 'created',
            amount: 0,
            currentLocation
        });

        return res.status(200).json({ tripId: trip._id, status: 'created', message: 'Trip request has been received.' });
    } catch (error) {
        console.log('Errorr', error);
    };
});

const updateTrip = asyncHandler(async (req, res) => {
    try {
        const { tripId } = req.params; // Extract trip ID from route params
        const { from, to, tripDate, cargoDetails, specialInstruction, currentLocation } = req.body;
        console.log('cargo ', cargoDetails);
        // Validate that at least one field to update is provided
        if (!from && !to && !tripDate && !cargoDetails && !specialInstruction && !currentLocation) {
            throw new ApiError(400, 'No fields provided for update');
        }

        // Find the trip and update its fields
        const updatedTrip = await Trip.findByIdAndUpdate(
            tripId,
            {
                ...(from && { from }),
                ...(to && { to }),
                ...(tripDate && { tripDate }),
                ...(cargoDetails && {
                    cargoDetails: {
                        cargoType: cargoDetails.cargoType,
                        quotePrice: cargoDetails.quotePrice,
                        payloadWeight: cargoDetails.payloadWeight,
                        payloadHeight: cargoDetails.payloadHeight,
                        payloadLength: cargoDetails.payloadLength,
                        payloadWidth: cargoDetails.payloadWidth,
                    }
                }),
                ...(specialInstruction && { specialInstruction }),
                // ...(currentLocation && { currentLocation }),
            },
            { new: true } // Return the updated trip
        );

        if (!updatedTrip) {
            throw new ApiError(404, 'Trip not found');
        }

        return res.status(200).json({
            message: 'Trip updated successfully',
            trip: updatedTrip,
        });
    } catch (error) {
        console.error('Error updating trip:', error);
        throw new ApiError(500, 'Failed to update trip');
    }
});

const handleStartBidding = asyncHandler(async (req, res) => {
    const { tripId } = req.params;
    const trip = await Trip.findById(tripId);

    if (!trip) throw new ApiError(400, 'Trip not found!');

    trip.biddingStatus = 'inProgress';
    trip.biddingStartTime = new Date();
    await trip.save();

    const { latitude, longitude } = await getCoordinatesFromPincode(trip.from);
    if (!latitude || !longitude) return res.status(400).json({ success: false, message: 'Bidding not started' });

    const vehicles = await Location.find({}, { cellId: 1, userId: 1, _id: 0 }).lean();
    const vehicleCellMap = new Map(vehicles.map(({ cellId, userId }) => [cellId, userId]));

    const nearbyDrivers = findNearbyDrivers(latitude, longitude, vehicleCellMap);
    if (!nearbyDrivers.length) return res.status(400).json({ success: false, message: 'Start your bid again' });

    await Promise.all([
        ...nearbyDrivers.map(userId => emitNewMessage("newTrip", userId, trip)),
        ...nearbyDrivers.map(userId => TripNotification.create({ trip, user: userId }))
    ]);

    return res.status(200).json({ success: true, message: 'Bidding started successfully', trip });
});

const findNearbyDrivers = (lat, lng, vehicleCellMap) => {
    const searchLevels = [13, 14, 15, 16, 17];
    const searchRadii = [10, 20, 50, 100];
    const BATCH_SIZE = 500;

    let nearbyDrivers = new Set();
    let checkedCellIds = new Set();

    for (const level of searchLevels) {
        for (const radius of searchRadii) {
            if (nearbyDrivers.size >= 5) return Array.from(nearbyDrivers);

            const expandFactor = Math.ceil(radius / 3);
            const newCellIds = getNearbyCellIds(lat, lng, level, expandFactor).filter(cellId => !checkedCellIds.has(cellId));
            newCellIds.forEach(cellId => checkedCellIds.add(cellId));

            for (let i = 0; i < newCellIds.length; i += BATCH_SIZE) {
                const matchedDrivers = newCellIds.slice(i, i + BATCH_SIZE).map(cell => vehicleCellMap.get(cell)).filter(Boolean);
                matchedDrivers.forEach(driver => nearbyDrivers.add(driver));

                if (nearbyDrivers.size >= 5) return Array.from(nearbyDrivers);
            }
        }
    }
    return Array.from(nearbyDrivers);
};

const getNearbyCellIds = (lat, lng, level, expandFactor, matchLevel = 13) => {
    const neighborCache = new Map();
    let allCells = new Set([S2.latLngToKey(lat, lng, level)]);

    for (let i = 0; i < expandFactor; i++) {
        let newCells = new Set();
        allCells.forEach(cellKey => {
            if (!neighborCache.has(cellKey)) {
                neighborCache.set(cellKey, S2.latLngToNeighborKeys(
                    S2.keyToLatLng(cellKey).lat,
                    S2.keyToLatLng(cellKey).lng,
                    level
                ));
            }
            newCells = new Set([...newCells, ...neighborCache.get(cellKey)]);
        });
        allCells = new Set([...allCells, ...newCells]);
    }
    return level > matchLevel
        ? Array.from(allCells).map(cellId => S2.idToKey(S2.keyToId(cellId), matchLevel)).filter(Boolean)
        : Array.from(allCells);
};

const getCoordinatesFromPincode = async (pincode) => {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${pincode}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    try {
        const response = await axios.get(url);
        const data = response.data;

        if (data.results && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            return {
                latitude: location.lat,
                longitude: location.lng,
            };
        } else {
            throw new Error('No results found for the given pincode.');
        }
    } catch (error) {
        console.error('Error fetching coordinates:', error.message);
        throw error;
    }
};

const updateTripStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const { tripId } = req.params;
    validateFields([tripId, status]);
    const trip = await Trip.findByIdAndUpdate(
        tripId,
        { status },
        { new: true, runValidators: true }
    );

    return res.status(200).json({ trip, message: 'Trip status updated successfully' })
});

const getTripDetails = asyncHandler(async (req, res) => {
    const { tripId } = req.params;
    validateFields([tripId]);
    const trip = await Trip.findById(tripId)
        .populate("counterPriceList.user", "fullName phoneNumber");
    // .populate("revisedPrice.vspUser", "fullName phoneNumber");

    return res.status(200).json({ trip, message: 'Trip details found successfully' })
});

const getCustomerAllTrips = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    validateFields([userId]);
    const trips = await Trip.find({ user: userId });

    return res.status(200).json({ trips, message: 'Trip details found successfully' })
});

const getAllTrips = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findOne({ _id: userId, bidAccepted: true });

    if (user) {
        return res.status(200).json({ trips: [], message: 'Thank you ! You have accepted a bid. Continue your journey safely!', bidAccepted: user.bidAccepted });
    }

    const trips = await TripNotification.aggregate([
        {
            $match: { user: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: mongoose.model("Trip").collection.name, // Correct collection reference
                localField: "trip",
                foreignField: "_id",
                as: "tripsData"
            }
        },
        {
            $unwind: "$tripsData"
        },
        {
            $match: {
                "tripsData.biddingStatus": "inProgress",
                $expr: {
                    $lt: [
                        new Date(),
                        {
                            $add: [
                                { $toDate: "$tripsData.biddingStartTime" },
                                1000 * 60 * 30,
                            ],
                        },
                    ],
                },
            }
        },
        {
            $project: {
                "tripsData": 1,
                _id: 0,
            }
        }
    ]);

    if (!trips || trips.length === 0) {
        return res.status(400).json({ message: "No trips found" });
    }

    // console.log('Trips: ', trips);
    return res.status(200).json({ trips, message: 'Trip details found successfully', bidAccepted: false });
});

const createTripPayment = asyncHandler(async (req, res) => {
    const { amount } = req.body;
    const { tripId } = req.params;

    validateFields([tripId, amount]);

    const trip = await Trip.findByIdAndUpdate(tripId, { amount }, { new: true });

    return res.status(200).json({ trip, message: 'Trip payment updated successfully.' })
});

const updateCounterPrice = asyncHandler(async (req, res) => {
    const { userId, counterPrice, tripId } = req.body;

    // Validate inputs
    if (!userId || !tripId || !counterPrice) {
        throw new ApiError(400, "Required fields: userId, tripId, counterPrice");
    }

    // Fetch trip and user data concurrently
    const [user, trip] = await Promise.all([
        User.findById(userId),
        Trip.findById(tripId).populate('counterPriceList.user'),
    ]);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (!trip) {
        throw new ApiError(404, "Trip not found");
    }

    console.log('Trip counter:', trip);

    if (trip.bids.length > 0 && trip.bidder.toString() === userId) {
        trip.bids.push({ price: counterPrice, user, role: user.type, timestamp: new Date() });
    } else {
        trip.counterPriceList.push({ counterPrice, user });
    }
    // Update trip counter price list

    await trip.save();

    await emitNewMessage("counterPrice", trip.user._id, {
        name: user.fullName,
        phoneNumber: user.phoneNumber,
        counterPrice: counterPrice || trip.cargoDetails.quotePrice,
        userId: user._id
    })

    console.log('Counter Price Submitted:', counterPrice);

    return res.status(200).json({
        success: true,
        message: "Counter price updated successfully!",
        trip
    });
});

const updateRevisedPrice = asyncHandler(async (req, res) => {
    const { userId, vspUserId, price, tripId } = req.body;

    // Validate inputs
    if (!vspUserId || !tripId || !price) {
        throw new ApiError(400, "Required fields: userId, tripId, counterPrice");
    }

    // Fetch trip and user data concurrently
    const [user, vspUser, trip] = await Promise.all([
        User.findById(userId),
        User.findById(vspUserId),
        Trip.findById(tripId),
    ]);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (!vspUser) {
        throw new ApiError(404, "VSP not found");
    }

    if (!trip) {
        throw new ApiError(404, "Trip not found");
    }
    // console.log(trip)
    if (!trip.bids.length) {
        const counterPriceObj = trip.counterPriceList.find(list => list.user.toString() === vspUserId);
        trip.bids.push({ price: counterPriceObj.counterPrice, user: vspUser, role: vspUser.type, timestamp: new Date() });
        trip.bidder = vspUser;
    }
    // Update trip counter price list
    // trip.bids = [...trip.bids, { price, user, role: user.type, timestamp: new Date() }];

    trip.bids.push({ price, user, role: user.type, timestamp: new Date() });


    await trip.save();

    // // if vsp is updating bid price
    // if (vspUser._id === user._id) {
    //     await emitNewMessage("counterPrice", trip.user._id, trip);
    // }

    await emitNewMessage("revisedPrice", vspUserId, trip);


    return res.status(200).json({
        success: true,
        message: "Revised price updated successfully!",
        trip
    });
});

const getBidPrice = asyncHandler(async (req, res) => {
    const { tripId } = req.body;

    if (!tripId) {
        throw new ApiError(404, "Trip id not found");
    }

    const trip = await Trip.findById(tripId);

    if (!trip) {
        throw new ApiError(404, "Trip not found");
    }

    return res.status(404).json({ success: true, bids: trip.bids });

});

const getCounterPrice = asyncHandler(async (req, res) => {
    const { tripId } = req.body;

    if (!tripId) {
        throw new ApiError(404, "Trip id not found");
    }

    const trip = await Trip.findById(tripId);

    if (!trip) {
        throw new ApiError(404, "Trip not found");
    }

    return res.status(404).json({ success: true, counterPriceList: trip.counterPriceList })
});

const acceptOrRejectBidRequest = asyncHandler(async (req, res) => {
    const { tripId, vspUserId, status } = req.body;

    // Validate input fields
    if (!tripId || !vspUserId) {
        return res.status(400).json({ message: "Trip ID and VSP Id are required." });
    }

    // Find the trip by ID
    const [trip, vspUser] = await Promise.all([Trip.findById(tripId), User.findById(vspUserId)]);
    if (!trip) {
        return res.status(404).json({ message: "Trip not found." });
    }

    if (!trip.bidder) {
        trip.bidder = vspUser;
    }

    // Check if the driver exists in the lastbidder array using phoneNumber
    const lastBidPrice = trip.bids.length ?
        trip.bids[trip.bids.length - 1].price
        :
        trip.counterPriceList.find(list => list.user.toString() === vspUserId).counterPrice;

    // Update the trip status and preserve the lastbidder data
    trip.status = status;
    trip.biddingStatus = 'accepted' // Set the status to completed
    trip.finalPrice = lastBidPrice; // Keep only the accepted driver in the lastbidder list

    vspUser.bidAccepted = true;
    // Save the updated trip
    await trip.save();
    await vspUser.save();
    await Location.findOneAndUpdate({ userId: vspUserId }, { available: false });

    // Respond with success
    return res.status(200).json({
        trip,
        message: `Bid status updated successfully.`,
    });
});

const getAcceptedBidTrips = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const trips = await Trip.find({ bidder: userId });

    if (!trips) {
        throw new ApiError(400, 'Trip not found');
    }

    return res.status(200).json({ trips, success: true, message: 'Trip found successfully' });
});

const changeTripStatus = async () => {
    const result = await Trip.updateMany(
        {
            biddingStatus: { $eq: 'inProgress' },
            $expr: {
                $gt: [
                    new Date(), // Current time
                    { $add: ['$biddingStartTime', 1000 * 60 * 30] } // Add 30 minutes to biddingStartTime
                ]
            }
        },
        {
            $set: {
                biddingStatus: 'rejected',
                status: 'cancelled'
            }
        }
    );

    return { result, message: 'Trip status changed successfully' };

};

const ownerTrips = async (req, res) => {
    const { ownerId } = req.params;

    console.log('owId', ownerId);

    try {
        const trips = await Trip.aggregate([
            {
                $match: { status: "inProgress" } // Only consider "progress" trips
            },
            {
                $sort: { createdAt: -1 } // Sort trips by date (latest first)
            },
            {
                $group: {
                    _id: "$bidder",
                    latestTrip: { $first: "$$ROOT" } // Get the latest trip for each driver
                }
            },
            {
                $lookup: {
                    from: "vehicles",
                    localField: "_id", // _id (driver) from the grouped result
                    foreignField: "driver", // Match with Vehicle's driver field
                    as: "vehicle"
                }
            },
            {
                $unwind: {
                    path: "$vehicle",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: { "vehicle.owner": new mongoose.Types.ObjectId(ownerId) } // Filter vehicles by ownerId
            },
            {
                $replaceRoot: { newRoot: "$latestTrip" } // Return clean latest trip data
            }
        ]);

        res.json(trips);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

cron.schedule('* * * * *', async (params) => {
    try {
        const response = await changeTripStatus();
        // console.log(response);
    } catch (error) {
        console.error('Error updating ULIP token:', error);
    }
})


export { createTrip, getTripDetails, getAllTrips, getCustomerAllTrips, createTripPayment, updateTripStatus, getDistance, updateCounterPrice, updateRevisedPrice, getBidPrice, getCounterPrice, acceptOrRejectBidRequest, updateTrip, handleStartBidding, getAcceptedBidTrips, changeTripStatus, paymentVerificationForTrip, ownerTrips };
