import { Vehicle } from "../models/vehicle.model.js";
import { User } from "../models/user.model.js";
import { GoodsReceipt } from "../models/GoodsReceipt.js";
import { BillReceipt } from "../models/BillReceipt.js";
import { uploadToS3 } from "./user.controller.js";
import { Trip } from "../models/trip.js";
import mongoose from "mongoose";
import { drivingLicenceVerification } from "../../utils/drivingLicenceVerification.js";
import { verifyAadharAndPAN } from "./user.controller.js";
import { validateFields } from "./user.controller.js";

// Function to upload all files to S3
const uploadFilesToS3 = async (files) => {
  const uploadedFiles = {};

  for (const fieldName in files) {
    // Ensure the field has files
    if (files[fieldName] && files[fieldName].length > 0) {
      // Upload each file in the array
      const uploaded = await Promise.all(
        files[fieldName].map(async (file) => {
          const s3Url = await uploadToS3(file.buffer, file.originalname, file.mimetype);
          return s3Url; // Return the S3 URL
        })
      );

      // Store the uploaded URLs by field name
      uploadedFiles[fieldName] = uploaded;
    }
  }

  return uploadedFiles;
};


export const addGoodsRecieve = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { vehicleNumber, driverId, currentLocation } = req.body;

    if (!vehicleNumber || !driverId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const parsedCurrentLocation =
      typeof currentLocation === "string" ? JSON.parse(currentLocation) : currentLocation;

    const driverObjectId = new mongoose.Types.ObjectId(driverId);
    const driver = await User.findById(driverObjectId).session(session);

    if (!driver) {
      throw new Error("Driver not found");
    }

    if (!req.files) {
      throw new Error("No files uploaded");
    }

    const uploadedFiles = await uploadFilesToS3(req.files);

    const goodsReceiptData = {
      vehicleNumber,
      grFiles: uploadedFiles["GR"]?.map((file) => file) || [],
      driver: driver._id,
      location: parsedCurrentLocation
        ? {
          type: "Point",
          coordinates: [parsedCurrentLocation.longitude, parsedCurrentLocation.latitude],
        }
        : undefined,
    };

    // Create GoodsReceipt Record
    const goodsReceipt = await GoodsReceipt.create([goodsReceiptData], { session });

    // Debugging: Check Trip Exists Before Updating
    const existingTrip = await Trip.findOne({
      bidder: driverObjectId,
      status: "inProgress",
    }).session(session);

    if (!existingTrip) {
      throw new Error(`No active trip found for bidder (driverId): ${driverObjectId}`);
    }

    console.log("Trip found before update:", existingTrip);

    // **Ensure bidder ID matches the driver ID**
    console.log("Driver ID from request:", driverId);
    console.log("Bidder ID from trip schema:", existingTrip.bidder.toString());

    if (existingTrip.bidder.toString() !== driverId) {
      throw new Error("Driver ID and Trip Bidder ID do not match!");
    }

    // Update Trip to Set grAccepted: true
    const updatedTrip = await Trip.findOneAndUpdate(
      { _id: existingTrip._id },
      { $set: { grAccepted: true } },
      { session, new: true }
    );

    if (!updatedTrip) {
      throw new Error(`Failed to update trip for bidder (driverId): ${driverObjectId}`);
    }

    console.log("Updated Trip:", updatedTrip);

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "GR added successfully and trip updated",
      goodsReceipt: goodsReceipt[0],
      trip: updatedTrip,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Error adding GR:", error.message);
    return res.status(400).json({ message: error.message || "Server error" });
  }
};


export const addBillReceipt = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { vehicleNumber, driverId, currentLocation } = req.body;

    if (!vehicleNumber || !driverId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Parse and validate location
    let parsedCurrentLocation = null;
    try {
      parsedCurrentLocation =
        typeof currentLocation === "string" ? JSON.parse(currentLocation) : currentLocation;
    } catch (error) {
      return res.status(400).json({ message: "Invalid location format" });
    }

    if (!parsedCurrentLocation || !parsedCurrentLocation.longitude || !parsedCurrentLocation.latitude) {
      return res.status(400).json({ message: "Invalid location data" });
    }

    // Check if driver exists
    const driverObjectId = new mongoose.Types.ObjectId(driverId);
    const driver = await User.findById(driverObjectId).session(session);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Handle file uploads
    if (!req.files) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const uploadedFiles = await uploadFilesToS3(req.files);
    const billFiles = uploadedFiles["BILL"]?.map((file) => file) || [];

    // Create Bill Receipt data
    const billReceiptData = {
      vehicleNumber,
      billFiles,
      driver: driver._id,
      location: {
        type: "Point",
        coordinates: [parsedCurrentLocation.longitude, parsedCurrentLocation.latitude],
      },
    };

    // Save Bill Receipt
    const billReceipt = await BillReceipt.create([billReceiptData], { session });

    // Check for active trip
    const existingTrip = await Trip.findOne({
      bidder: driverObjectId,
      status: "inProgress",
    }).session(session);

    if (!existingTrip) {
      return res.status(404).json({ message: `No active trip found for driverId: ${driverId}` });
    }

    // Ensure driver is the bidder
    if (existingTrip.bidder.toString() !== driverId) {
      return res.status(400).json({ message: "Driver ID and Trip Bidder ID do not match!" });
    }

    // Update trip to set billAccepted: true
    const updatedTrip = await Trip.findOneAndUpdate(
      { _id: existingTrip._id },
      { $set: { billAccepted: true } },
      { session, new: true }
    );

    if (!updatedTrip) {
      return res.status(500).json({ message: `Failed to update trip for driverId: ${driverId}` });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Bill Receipt added successfully and trip updated",
      billReceipt: billReceipt[0],
      trip: updatedTrip,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Error adding Bill Receipt:", error.message);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

export const addVehicle = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      vehicleNumber,
      vehicleHeight,
      vehicleWidth,
      vehicleLength,
      ownerId,
      driverFullName,
      driverEmail,
      driverPhoneNumber,
      driverAadharNumber,
      driverPanNumber,
      driverDlNumber,
      driverDob,
      driverGender,
      currentLocation
    } = req.body;

    const parsedCurrentLocation = currentLocation ? JSON.parse(currentLocation) : null;

    // Check required fields
    if (!vehicleNumber || !vehicleHeight || !vehicleWidth || !vehicleLength || !ownerId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate owner
    const [owner, isVehicleExist] = await Promise.all([User.findById(ownerId).session(session), Vehicle.findOne({ vehicleNumber })]);

    if (!owner) {
      throw new Error("Owner not found");
    }

    if (isVehicleExist) {
      throw new Error("Vehicle already exists");
    }

    // Upload files
    const uploadedFiles = await uploadFilesToS3(req.files);

    // Create vehicle
    const vehicleData = {
      vehicleNumber,
      rcCopy: uploadedFiles["rcCopy"]?.length ? uploadedFiles["rcCopy"].map((r) => r) : [],
      height: vehicleHeight,
      width: vehicleWidth,
      length: vehicleLength,
      owner,
      tdsDeclaration: uploadedFiles["tdsDeclaration"]?.length ? uploadedFiles["tdsDeclaration"].map((r) => r) : [],
      ownerConsent: uploadedFiles["ownerConsent"]?.length ? uploadedFiles["ownerConsent"].map((r) => r) : [],
      location: {
        type: 'Point',
        coordinates: [
          parsedCurrentLocation?.latitude?.length > 0 ? parsedCurrentLocation?.latitude : '77.1518441',
          parsedCurrentLocation?.longitude?.length > 0 ? parsedCurrentLocation?.longitude : '28.6909391']
      },
    };

    const vehicle = await Vehicle.create([{ ...vehicleData }], { session });

    const parsedDriverDob = driverDob ? JSON.parse(driverDob) : null;

    const dateObj = new Date(parsedDriverDob);

    // Format the date
    const formattedDob = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

    // Create driver
    const driverData = {
      fullName: driverFullName,
      email: driverEmail,
      phoneNumber: driverPhoneNumber,
      aadharNumber: driverAadharNumber,
      panNumber: driverPanNumber,
      dlNumber: driverDlNumber,
      dob: dateObj,
      gender: driverGender,
      profileImage: uploadedFiles["driverProfileImage"]?.[0] || "",
      type: "driver",
      vehicle: vehicle[0]._id, // Associate with the created vehicle
    };

    validateFields([driverFullName, driverPhoneNumber, driverAadharNumber, driverPanNumber, driverDlNumber, formattedDob, driverGender]);

    //verify Aadhar, Pan, Dl
    // await verifyAadharAndPAN(driverAadharNumber, driverPanNumber, driverFullName, formattedDob, driverGender, driverPhoneNumber);
    // await drivingLicenceVerification(driverDlNumber, formattedDob);

    const driver = await User.create([{ ...driverData }], { session });

    // Update vehicle with driver
    await Vehicle.findByIdAndUpdate(
      vehicle[0]._id,
      { driver: driver[0]._id },
      { new: true, session }
    );

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({ message: "Vehicle added successfully" });
  } catch (error) {
    // Rollback transaction
    await session.abortTransaction();
    session.endSession();

    console.error("Error adding vehicle:", error.message);
    return res.status(400).json({ message: error.message || "Server error" });
  }
};


// Get Vehicles by Owner ID Controller
export const getVehiclesByOwnerId = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const { searchText } = req.query;

    // Validate owner ID
    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    // Build the search criteria
    const searchCriteria = { owner: ownerId };
    if (searchText) {
      // Use a regular expression to perform a case-insensitive search
      searchCriteria.vehicleNumber = { $regex: searchText, $options: 'i' };
    }

    // Fetch vehicles based on search criteria
    const vehicles = await Vehicle.find(searchCriteria).limit(10);

    return res.status(200).json({
      message: "Vehicles fetched successfully",
      vehicles
    });
  } catch (error) {
    console.error("Error fetching vehicles by owner ID:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};


// Update Vehicle by Number Controller
export const updateVehicleByNumber = async (req, res) => {
  try {
    const { vehicleNumber } = req.params;
    const updateData = req.body;

    // Find the vehicle by vehicleNumber
    const vehicle = await Vehicle.findOneAndUpdate(
      { vehicleNumber },
      { $set: updateData }, // Only update specified fields
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    res.status(200).json({ message: "Vehicle updated successfully", vehicle });
  } catch (error) {
    console.error("Error updating vehicle:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Get Vehicle by Number Controller
export const getVehicleByNumber = async (req, res) => {
  try {
    const { vehicleNumber } = req.params;

    const vehicle = await Vehicle.findOne({ vehicleNumber });
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    res.status(200).json({ message: "Vehicle fetched successfully", vehicle });
  } catch (error) {
    console.log("Error fetching vehicle:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

export const updateVehicleLocation = async (req, res) => {
  try {
    const { currentLocation, driverPhoneNumber } = req.body;

    // Assuming `User` is the model for the referenced "User" collection
    const driver = await User.findOne({ phoneNumber: driverPhoneNumber, type: 'driver' });

    if (driver) {
      const vehicle = await Vehicle.findOneAndUpdate(
        { driver: driver._id }, // Match the vehicle with this driver's _id
        {
          location: {
            type: "Point",
            coordinates: [currentLocation.longitude, currentLocation.latitude],
          },
        },
        { new: true } // Return the updated document
      );

      if (vehicle) {
        console.log("Vehicle location updated:");
      } else {
        console.log("No vehicle found for the provided driver.");
      }
    } else {
      console.log("No driver found with the provided phone number.");
    }

    return res.status(200).json({ success: true, message: 'Location updated !' });

  } catch (error) {
    console.log("Error fetching vehicle:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }

}

export const getVehicleById = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    if (!vehicleId) {
      return res.status(400).json({ message: "Vehicle ID is required" });
    }

    const vehicle = await Vehicle.findById(vehicleId)
      .populate("owner", "fullName email phoneNumber")
      .populate("broker", "fullName email phoneNumber")
      .populate("driver", "fullName email phoneNumber aadharNumber panNumber dlNumber dob gender profileImage")
      .exec();

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    return res.status(200).json(vehicle);
  } catch (error) {
    console.error("Error fetching vehicle details:", error);
    return res.status(500).json({ message: "Server error" });
  }
};