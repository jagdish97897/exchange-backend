
import { Vehicle } from "../models/vehicle.model.js";
import { User } from "../models/user.model.js";

// Add Vehicle Controller
export const addVehicle = async (req, res) => {
  try {
    const {
      vehicleNumber,
      rcCopy,
      height,
      width,
      length,
      ownerId,
      brokerId,
      latitude,
      longitude,
      tdsDeclaration,
      ownerConsent,
      brokerConsent,
      driver, // Including driver details
    } = req.body;

    // Check required fields
    if (!vehicleNumber || !rcCopy || !height || !width || !length || !ownerId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate owner
    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    // Validate broker (if provided)
    if (brokerId) {
      const broker = await User.findById(brokerId);
      if (!broker) {
        return res.status(404).json({ message: "Broker not found" });
      }
    }

    // Create vehicle
    const newVehicle = new Vehicle({
      vehicleNumber,
      rcCopy,
      height,
      width,
      length,
      owner: ownerId,
      broker: brokerId || undefined,
      latitude,
      longitude,
      tdsDeclaration,
      ownerConsent,
      brokerConsent,
      driver, // Saving nested driver details
    });

    // Save vehicle
    await newVehicle.save();
    res.status(201).json({ message: "Vehicle added successfully", vehicle: newVehicle });
  } catch (error) {
    console.error("Error adding vehicle:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Get Vehicles by Owner ID Controller
export const getVehiclesByOwnerId = async (req, res) => {
  try {
    const { ownerId } = req.params;

    // Validate owner ID
    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    // Fetch vehicles by owner ID
    const vehicles = await Vehicle.find({ owner: ownerId });
    res.status(200).json({ message: "Vehicles fetched successfully", vehicles });
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
    console.error("Error fetching vehicle:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};



// import { Vehicle } from "../models/vehicle.model.js";
// import { User } from "../models/user.model.js";

// // Add Vehicle Controller
// export const addVehicle = async (req, res) => {
//   try {
//     const {
//       vehicleNumber,
//       rcCopy,
//       height,
//       width,
//       length,
//       ownerId,
//       brokerId,
//       latitude,
//       longitude,
//       tdsDeclaration,
//       ownerConsent,
//       brokerConsent,
//     } = req.body;

//     // Check required fields
//     if (!vehicleNumber || !rcCopy || !height || !width || !length || !ownerId) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     // Validate owner
//     const owner = await User.findById(ownerId);
//     if (!owner) {
//       return res.status(404).json({ message: "Owner not found" });
//     }

//     // Validate broker (if provided)
//     let broker = null;
//     if (brokerId) {
//       broker = await User.findById(brokerId);
//       if (!broker) {
//         return res.status(404).json({ message: "Broker not found" });
//       }
//     }

//     // Create vehicle
//     const newVehicle = new Vehicle({
//       vehicleNumber,
//       rcCopy,
//       height,
//       width,
//       length,
//       owner: ownerId,
//       broker: brokerId || undefined,
//       latitude,
//       longitude,
//       tdsDeclaration,
//       ownerConsent,
//       brokerConsent,
//     });

//     // Save vehicle
//     await newVehicle.save();

//     res.status(201).json({ message: "Vehicle added successfully", vehicle: newVehicle });
//   } catch (error) {
//     console.error("Error adding vehicle:", error);
//     if (error.name === "ValidationError") {
//       return res.status(400).json({ message: error.message });
//     }
//     res.status(500).json({ message: "Server error" });
//   }
// };

// export const getVehiclesByOwnerId = async (req, res) => {
//   try {
//     const { ownerId } = req.params;

//     // Validate owner ID
//     const owner = await User.findById(ownerId);
//     if (!owner) {
//       return res.status(404).json({ message: "Owner not found" });
//     }

//     // Fetch vehicles by owner ID
//     const vehicles = await Vehicle.find({ owner: ownerId });

//     if (vehicles.length === 0) {
//       return res.status(404).json({ message: "No vehicles found for the specified owner" });
//     }

//     res.status(200).json({ message: "Vehicles fetched successfully", vehicles });
//   } catch (error) {
//     console.error("Error fetching vehicles by owner ID:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // Update Vehicle Controller
// export const updateVehicleByNumber = async (req, res) => {
//   try {
//     const { vehicleNumber } = req.params; // Extract vehicleNumber from request parameters
//     const updateData = req.body; // Extract update data from request body

//     // Check if vehicleNumber is provided
//     if (!vehicleNumber) {
//       return res.status(400).json({ message: "Vehicle number is required" });
//     }

//     // Find the vehicle by vehicleNumber
//     const vehicle = await Vehicle.findOne({ vehicleNumber });
//     if (!vehicle) {
//       return res.status(404).json({ message: "Vehicle not found" });
//     }

//     // Update the vehicle with the new data
//     Object.assign(vehicle, updateData);

//     // Save the updated vehicle
//     await vehicle.save();

//     res.status(200).json({ message: "Vehicle updated successfully", vehicle });
//   } catch (error) {
//     console.error("Error updating vehicle:", error);
//     if (error.name === "ValidationError") {
//       return res.status(400).json({ message: error.message });
//     }
//     res.status(500).json({ message: "Server error" });
//   }
// };

// export const getVehicleByNumber = async (req, res) => {
//   try {
//     const { vehicleNumber } = req.params; // Extract vehicleNumber from request parameters

//     // Check if vehicleNumber is provided
//     if (!vehicleNumber) {
//       return res.status(400).json({ message: "Vehicle number is required" });
//     }

//     // Find the vehicle by vehicleNumber
//     const vehicle = await Vehicle.findOne({ vehicleNumber });
//     if (!vehicle) {
//       return res.status(404).json({ message: "Vehicle not found" });
//     }

//     res.status(200).json({ message: "Vehicle fetched successfully", vehicle });
//   } catch (error) {
//     console.error("Error fetching vehicle by vehicle number:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };
