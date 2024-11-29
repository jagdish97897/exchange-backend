import express from "express";
import {
    addVehicle,
    getVehiclesByOwnerId,
    updateVehicleByNumber,
    getVehicleByNumber
} from "../controllers/vehicle.controllers.js";

const router = express.Router();

router.post("/vehicles", addVehicle);
router.get("/vehicles/owner/:ownerId", getVehiclesByOwnerId);
router.put("/vehicles/update/:vehicleNumber", updateVehicleByNumber);
router.get("/vehicles/:vehicleNumber", getVehicleByNumber);
// router.get("/vehicles", getAllVehicles);
// router.get("/vehicles/:id", getVehicleById);
// router.put("/vehicles/:id", updateVehicle);
// router.delete("/vehicles/:id", deleteVehicle);

export default router;
