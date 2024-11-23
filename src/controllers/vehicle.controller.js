import { Vehicle } from "../models/vehicle";
import { User } from "../models/user.model";
import { validateFields } from "./user.controller";

const registerVehicle = async (req, res) => {
    const { vehicleNumber, rcCopy, height, width, length, ownerId, brokerId, biddingAuthorization } = req.body;

    validateFields([vehicleNumber, rcCopy, height, width, length, ownerId, brokerId, biddingAuthorization]);

    vehicleNumber.create({ vehicleNumber, rcCopy, height, width, length, owner, brokers, biddingAuthorization })

}

export { registerVehicle }