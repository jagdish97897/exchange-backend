import { Trip } from "../models/trip.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateFields } from "./user.controller.js";
import axios from "axios";
import { Vehicle } from "../models/vehicle.model.js";
import { server } from '../app.js';
import { emitNewMessage, configureSocket } from "../webSocket.js";

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

        const data = await getCoordinatesFromPincode(from);

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

            const promises = userIds.map(userId => emitNewMessage(userId, trip));

            await Promise.all(promises);
        }

        return res.status(200).json({ tripId: trip._id, status: 'created', message: 'Trip request has been received.' });
    } catch (error) {
        console.log('Errorr', error);
    };
});


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

// Usage
// getCoordinatesFromPincode('110001')
//     .then(coords => console.log('Coordinates:', coords))
//     .catch(err => console.error(err));

const updateTripStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const { tripId } = req.params;
    validateFields([tripId, status]);
    const trip = await Trip.findByIdAndUpdate(
        tripId,
        { status },
        { new: true, runValidators: true } // Enables validation and returns the updated document  
    );

    return res.status(200).json({ trip, message: 'Trip status updated successfully' })
});

const getTripDetails = asyncHandler(async (req, res) => {
    const { tripId } = req.params;
    validateFields([tripId]);
    const trip = await Trip.findById(tripId);

    return res.status(200).json({ trip, message: 'Trip details found successfully' })
});

const getCustomerAllTrips = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    validateFields([userId]);
    const trips = await Trip.find({ user: userId });

    return res.status(200).json({ trips, message: 'Trip details found successfully' })
});

const getAllTrips = asyncHandler(async (req, res) => {
    const trips = await Trip.find();
    if (!trips || trips.length === 0) {
        return res.status(404).json({ message: "No trips found" });
    }
    return res.status(200).json({ trips, message: 'Trip details found successfully' });
});

const createTripPayment = asyncHandler(async (req, res) => {
    const { amount } = req.body;
    const { tripId } = req.params;

    validateFields([tripId, amount]);

    // use Razorpay for payment
    // verify payment
    // then update trip amount

    const trip = await Trip.findByIdAndUpdate(tripId, { amount }, { new: true });

    return res.status(200).json({ trip, message: 'Trip payment updated successfully.' })
});



export { createTrip, getTripDetails, getAllTrips, getCustomerAllTrips, createTripPayment, updateTripStatus, getDistance };
