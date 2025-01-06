import { Trip } from "../models/trip.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateFields } from "./user.controller.js";
import axios from "axios";
import { Vehicle } from "../models/vehicle.model.js";
import { server } from '../app.js';
import { emitNewMessage, configureSocket } from "../webSocket.js";
import { ApiError } from "../utils/ApiError.js";

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
        const { from, to, tripDate, cargoDetails, specialInstruction, currentLocation } = req.body; // Extract fields to update
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

    if (!trip) {
        throw new ApiError(400, 'Trip not found!');
    }

    trip.biddingStatus = 'inProgress';
    trip.biddingStartTime = new Date();

    await trip.save();

    const data = await getCoordinatesFromPincode(trip.from);

    if (data.latitude && data.longitude) {
        // const vehicles = await Vehicle.aggregate([
        //     {
        //         $geoNear: {
        //             near: { type: "Point", coordinates: [data.latitude, data.longitude] },
        //             distanceField: "distance",
        //             spherical: true,
        //             maxDistance: 100000, // 100 Kms
        //         },
        //     },
        //     // {
        //     //     $lookup: {
        //     //         from: "users", // Name of the collection for the User model
        //     //         localField: "driver",
        //     //         foreignField: "_id",
        //     //         as: "driverDetails",
        //     //     },
        //     // },
        //     // {
        //     //     $lookup: {
        //     //         from: "users", // Name of the collection for the User model
        //     //         localField: "owner",
        //     //         foreignField: "_id",
        //     //         as: "ownerDetails",
        //     //     },
        //     // },
        //     {
        //         $sort: { distance: 1 },
        //     },
        // ]);

        const nearbyVehicles = await Vehicle.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [data.latitude, data.longitude], //  Latitude, Longitude
                    },
                    $maxDistance: 10000000, // 10 kilometers
                },
            },
        })
            .populate("driver", "fullName phoneNumber") // Populate specific fields from the User model
            .populate("owner", "fullName email"); // Populate specific fields from the User model

        // console.log('nearbyVehicles : ', nearbyVehicles);

        const userIds = nearbyVehicles.reduce((acc, value) => {
            if (value.owner && value.owner._id) {
                acc.push(value.owner._id); // Add owner ID to the accumulator
            }

            if (value.driver && value.driver._id) {
                acc.push(value.driver._id); // Add driver ID to the accumulator
            }

            return acc; // Return the updated accumulator
        }, []); // Initialize accumulator as an empty array

        // console.log(userIds);

        const promises = userIds.map(userId => emitNewMessage("newTrip", userId, trip));

        await Promise.all(promises);

        return res.status(200).json({ success: true, message: 'Bidding started successfully' });
    }

    return res.status(400).json({ success: false, message: 'Bidding not started', trip });

})

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
    const trips = await Trip.find({
        biddingStatus: { $eq: 'inProgress' },
        $expr: {
            $lt: [
                new Date(), // Current time
                { $add: ['$biddingStartTime', 1000 * 60 * 30] } // Add 30 minutes to biddingStartTime
            ]
        }
    });
    if (!trips || trips.length === 0) {
        return res.status(404).json({ message: "No trips found" });
    }
    return res.status(200).json({ trips, message: 'Trip details found successfully' });
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
        Trip.findById(tripId),
    ]);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (!trip) {
        throw new ApiError(404, "Trip not found");
    }

    // Update trip counter price list
    trip.counterPriceList.push({ counterPrice, user });

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

const updateBidPrice = asyncHandler(async (req, res) => {
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
    console.log(trip)
    if (!trip.bids.length) {
        const counterPriceObj = trip.counterPriceList.find(list => list.user.toString() === vspUserId);
        trip.bids.push({ price: counterPriceObj.counterPrice, user: vspUser, role: vspUser.type, timestamp: new Date() });
        trip.bidder = vspUser;
    }
    // Update trip counter price list
    // trip.bids = [...trip.bids, { price, user, role: user.type, timestamp: new Date() }];

    trip.bids.push({ price, user, role: user.type, timestamp: new Date() });


    await trip.save();

    // if vsp is updating bid price
    if (vspUser._id === user._id) {
        await emitNewMessage("counterPrice", trip.user._id, trip);
    }

    await emitNewMessage("revisedPrice", user._id, trip);


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

    // Save the updated trip
    await trip.save();

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
})

export { createTrip, getTripDetails, getAllTrips, getCustomerAllTrips, createTripPayment, updateTripStatus, getDistance, updateCounterPrice, updateBidPrice, getBidPrice, getCounterPrice, acceptOrRejectBidRequest, updateTrip, handleStartBidding, getAcceptedBidTrips };
