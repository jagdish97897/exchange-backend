
import { Vehicle } from "../models/vehicle.model.js";
import { User } from "../models/user.model.js";
import { uploadToS3 } from "./user.controller.js";
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

  return uploadedFiles; // Return all uploaded file URLs
};

// const uploadFilesToS3 = async (files) => {
//   const uploadPromises = []; // Array to hold all upload promises
//   const uploadedFiles = {}; // To store S3 URLs with field names

//   for (const [fieldName, fileArray] of Object.entries(files)) {
//     uploadedFiles[fieldName] = [];

//     for (const file of fileArray) {
//       const { buffer, originalname, mimetype } = file;

//       // Create a promise for each upload and store it
//       const uploadPromise = uploadToS3(buffer, originalname, mimetype)
//         .then((s3Url) => {
//           uploadedFiles[fieldName].push(s3Url); // Add URL to respective field
//         });

//       uploadPromises.push(uploadPromise);
//     }
//   }

//   // Wait for all uploads to complete
//   await Promise.all(uploadPromises);

//   return uploadedFiles; // Return the URLs for all uploaded files
// };


// Add Vehicle Controller
// export const addVehicle = async (req, res) => {
//   try {
//     const {
//       vehicleNumber,
//       vehicleHeight,
//       vehicleWidth,
//       vehicleLength,
//       ownerId,
//       driverFullName,
//       driverEmail,
//       driverPhoneNumber,
//       driverAadharNumber,
//       driverPanNumber,
//       driverDlNumber,
//       driverDob,
//       driverGender,
//     } = req.body;

//     // Check required fields
//     if (!vehicleNumber || !vehicleHeight || !vehicleWidth || !vehicleLength || !ownerId) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     // Validate owner
//     const owner = await User.findById(ownerId);
//     console.log('ower : ', owner)
//     if (!owner) {
//       return res.status(404).json({ message: "Owner not found" });
//     }

//     // Upload files
//     const uploadedFiles = await uploadFilesToS3(req.files);

//     // Create vehicle
//     const vehicleData = {
//       vehicleNumber,
//       rcCopy: uploadedFiles["rcCopy"].map(r => r),
//       height: vehicleHeight,
//       width: vehicleWidth,
//       length: vehicleLength,
//       owner,
//       latitude: 24,
//       longitude: 24,
//       tdsDeclaration: uploadedFiles["tdsDeclaration"].map(r => r),
//       ownerConsent: uploadedFiles["ownerConsent"].map(r => r),
//     };

//     const vehicle = await Vehicle.create(vehicleData);

//     const parsedDriverDob = driverDob ? JSON.parse(driverDob) : null;
//     console.log(typeof new Date(parsedDriverDob), parsedDriverDob, 'driver dob', new Date(parsedDriverDob));

//     // Create driver (parallel task)
//     const driverData = {
//       fullName: driverFullName,
//       email: driverEmail,
//       phoneNumber: driverPhoneNumber,
//       aadharNumber: driverAadharNumber,
//       panNumber: driverPanNumber,
//       dlNumber: driverDlNumber,
//       dob: new Date(parsedDriverDob),
//       gender: driverGender,
//       profileImage: uploadedFiles["driverProfileImage"]?.[0] || "",
//       type: "driver",
//       vehicle,
//     };

//     const driverPromise = User.create(driverData);

//     // Update vehicle with driver (run parallel with driver creation)
//     const vehicleUpdatePromise = Vehicle.findByIdAndUpdate(
//       vehicle._id,
//       { driver: (await driverPromise)._id }, // Wait only here for the driver result
//       { new: true }
//     );

//     await Promise.all([driverPromise, vehicleUpdatePromise]);

//     return res.status(201).json({ message: "Vehicle added successfully" });
//   } catch (error) {
//     console.error("Error adding vehicle:", error.message);
//     return res.status(400).json({ message: error.message || "Server error" });
//   }
// };

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
    const owner = await User.findById(ownerId).session(session);

    if (!owner) {
      throw new Error("Owner not found");
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
    await verifyAadharAndPAN(driverAadharNumber, driverPanNumber, driverFullName, formattedDob, driverGender, driverPhoneNumber);
    await drivingLicenceVerification(driverDlNumber, formattedDob);

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