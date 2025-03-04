import express from "express";
import {
    addVehicle,
    getVehiclesByOwnerId,
    updateVehicleByNumber,
    getVehicleByNumber,
    // getAllVehicles,
    updateVehicleLocation,
    addGoodsRecieve,
    addBillReceipt,
    getVehicleById,
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
router.post(
    "/create1",
    upload.fields([
        { name: 'GR', maxCount: 1 },
    ]),
    addGoodsRecieve
);
router.post(
    "/create2",
    upload.fields([
        { name: 'BILL', maxCount: 1 },
    ]),
    addBillReceipt
);
router.get("/owner/:ownerId", getVehiclesByOwnerId);
router.get("/vehicle/:vehicleId", getVehicleById);
router.put("/update/:vehicleNumber", updateVehicleByNumber);
router.get("/:vehicleNumber", getVehicleByNumber);
// router.get("/all", getAllVehicles);
// router.get("/vehicles", getAllVehicles);
// router.get("/vehicles/:id", getVehicleById);
router.patch("/location", updateVehicleLocation);
// router.delete("/vehicles/:id", deleteVehicle);
router.get("/vehicle/:vehicleId", getVehicleById);

export default router;
