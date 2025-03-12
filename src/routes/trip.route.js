import { Router } from "express";
import { createTrip, getTripDetails, getAllTrips, getCustomerAllTrips, createTripPayment, updateTripStatus, getDistance, updateCounterPrice, updateRevisedPrice, getCounterPrice, getBidPrice, acceptOrRejectBidRequest, updateTrip, handleStartBidding, getAcceptedBidTrips, paymentVerificationForTrip, ownerTrips } from "../controllers/trip.js";


const router = Router();

router.route("/create").post(createTrip);
router.route("/history/:userId").get(getAllTrips);
router.route("/distance").get(getDistance);
router.route("/:tripId").get(getTripDetails);
router.route("/:tripId/status").put(updateTripStatus);
router.route("/customer/:userId").get(getCustomerAllTrips);
router.route("/:tripId/payment").post(createTripPayment);
router.route("/counterPrice").patch(updateCounterPrice);
router.route("/revisedPrice").patch(updateRevisedPrice);
router.route("/:tripId/counterPrice").get(getCounterPrice);
router.route("/:tripId/revisedPrice").get(getBidPrice);
router.route("/bidStatus").patch(acceptOrRejectBidRequest);
router.route("/:tripId").patch(updateTrip);
router.route("/:tripId/startBidding").post(handleStartBidding);
router.route("/:userId/acceptedBidTrips").get(getAcceptedBidTrips);
router.post("/paymentVerificationForTrip", paymentVerificationForTrip);
router.get("/owner/:ownerId/progressTrip", ownerTrips);

export default router;