import { Router } from "express";
import { createTrip, getTripDetails, getAllTrips, getCustomerAllTrips, createTripPayment, updateTripStatus } from "../controllers/trip.js";


const router = Router();

router.route("/create").post(createTrip);
router.route("/history").get(getAllTrips);
router.route("/:tripId").get(getTripDetails);
router.route("/:tripId/status").put(updateTripStatus);
router.route("/customer/:userId").get(getCustomerAllTrips);
router.route("/:tripId/payment").post(createTripPayment);

export default router;