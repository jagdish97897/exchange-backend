import { Router } from "express";
import { createTrip, getTripDetails, getAllTrips, getCustomerAllTrips, createTripPayment, updateTripStatus, getDistance, updateCounterPrice, updateRevisedPrice, getCounterPrice, getRevisedPrice } from "../controllers/trip.js";


const router = Router();

router.route("/create").post(createTrip);
router.route("/history").get(getAllTrips);
router.route("/distance").get(getDistance);
router.route("/:tripId").get(getTripDetails);
router.route("/:tripId/status").put(updateTripStatus);
router.route("/customer/:userId").get(getCustomerAllTrips);
router.route("/:tripId/payment").post(createTripPayment);
router.route("/counterPrice").patch(updateCounterPrice);
router.route("/revisedPrice").patch(updateRevisedPrice);
router.route("/:tripId/counterPrice").get(getCounterPrice);
router.route("/:tripId/revisedPrice").get(getRevisedPrice);

export default router;