import { Trip } from "../models/trip.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateFields } from "./user.controller.js";

const createTrip = asyncHandler(async (req, res) => {
    const { from, to, userId, tripDate, cargoDetails, specialInstruction } = req.body;

    validateFields([from, to, userId]);

    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(400, 'User not found');
    }

    const trip = await Trip.create({ user, from, to, tripDate: tripDate || new Date(), cargoDetails, specialInstruction, status: 'created', amount: 0 });

    return res.status(200).json({ tripId: trip._id, status: 'created', message: 'Trip request has been received.' })
});

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



export { createTrip, getTripDetails, getAllTrips, getCustomerAllTrips, createTripPayment, updateTripStatus };
