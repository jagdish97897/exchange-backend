import express from "express";
import {
    addVehicle,
    getVehiclesByOwnerId,
    updateVehicleByNumber,
    getVehicleByNumber,
    // getAllVehicles,
    updateVehicleLocation
} from "../controllers/vehicle.controller.js";
import { upload } from "../middlewares/multer.middleware.js";


const router = express.Router();

router.post(
    "/create",
    upload.fields([
        { name: 'rcCopy', maxCount: 1 },
        { name: 'driverProfileImage', maxCount: 1 },
        { name: 'tdsDeclaration', maxCount: 1 },
        { name: 'ownerConsent', maxCount: 1 },
    ]),
    addVehicle
);
router.get("/owner/:ownerId", getVehiclesByOwnerId);
router.put("/update/:vehicleNumber", updateVehicleByNumber);
router.get("/:vehicleNumber", getVehicleByNumber);
// router.get("/all", getAllVehicles);
// router.get("/vehicles", getAllVehicles);
// router.get("/vehicles/:id", getVehicleById);
router.patch("/location", updateVehicleLocation);
// router.delete("/vehicles/:id", deleteVehicle);

export default router;
