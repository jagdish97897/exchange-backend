import { Location } from "../models/locationModel.js";
import { User } from "../models/user.model.js";
import { getZone } from "../../utils/location.js";
import mongoose from "mongoose";

socket.on("saveLocation", async (data) => {
    try {
      const { userId, latitude, longitude } = data;

      const userExists = await User.findById(userId).select("_id");
      if (!userExists) {
        socket.emit("error", "User not found");
        return;
      }   
      const zone = getZone(latitude, longitude);

      // Save location and update user in parallel
      const location = new Location({ userId, latitude, longitude, zone });

      await Promise.all([
        location.save(),
        User.updateOne({ _id: userId }, { $set: { currentLocation: { latitude, longitude, zone } } }),
      ]);

      io.emit("receiveLocation", { userId, latitude, longitude, zone });
    } catch (error) {
      console.error("Error saving location:", error);
      socket.emit("error", "Failed to save location");
    }
  });


  
  socket.on("getUserLocation", async ({ userId }) => {
    try {
      if (!userId) {
        return socket.emit("error", "userId is required");
      }
  
      const location = await Location.findOne({ userId }).select("latitude longitude");
  
      if (!location) {
        return socket.emit("error", "User location not found");
      }
  
      socket.emit("receiveUserLocation", {
        latitude: location.latitude,
        longitude: location.longitude,
      });
    } catch (error) {
      console.error("Error fetching location:", error);
      socket.emit("error", "Failed to fetch user location");
    }
  });
  

  // socket.on("getUserLocation", async ({ userId }, callback) => {
  //   try {
  //     if (!userId) {
  //       callback({ error: "User ID is required" });
  //       return;
  //     }
  
  //     const objectId = new mongoose.Types.ObjectId(userId);
  //     const location = await Location.findOne({ userId: objectId }).sort({ createdAt: -1 });
  
  //     if (!location) {
  //       callback({ error: `No location found for user: ${userId}` });
  //       return;
  //     }
  
  //     callback({
  //       userId: location.userId.toString(),
  //       latitude: location.latitude,
  //       longitude: location.longitude,
  //       zone: location.zone,
  //       timestamp: location.timestamp,
  //     });
  //   } catch (error) {
  //     callback({ error: "Failed to retrieve location" });
  //   }
  // });
  

  // socket.on("getUserLocation", async ({ userId }) => {
  //   try {
  //     console.log("Received userId from client:", userId); // Log userId from client
  
  //     if (!userId) {
  //       console.log("Error: User ID is required");
  //       socket.emit("locationResponse", { error: "User ID is required" });
  //       return;
  //     }
  
  //     const objectId = new mongoose.Types.ObjectId(userId); // Convert to ObjectId
  //     console.log("Converted ObjectId:", objectId); // Log converted ObjectId
  
  //     const location = await Location.findOne({ userId: objectId }).sort({ createdAt: -1 });
  
  //     console.log("Queried Location Result:", location); // Log location result
  
  //     if (!location) {
  //       console.log(`No location found for user: ${userId}`);
  //       socket.emit("locationResponse", { error: `No location found for user: ${userId}` });
  //       return;
  //     }
  
  //     console.log("Sending Location Response:", {
  //       userId: location.userId.toString(),
  //       latitude: location.latitude,
  //       longitude: location.longitude,
  //       zone: location.zone,
  //       timestamp: location.timestamp,
  //     });
  
  //     socket.emit("locationResponse", {
  //       userId: location.userId.toString(),
  //       latitude: location.latitude,
  //       longitude: location.longitude,
  //       zone: location.zone,
  //       timestamp: location.timestamp,
  //     });
  //   } catch (error) {
  //     console.error("Error retrieving user location:", error);
  //     socket.emit("locationResponse", { error: "Failed to retrieve location. Please try again later." });
  //   }
  // });

// Get Latest User Location via Socket
// socket.on("getUserLocation", async ({ userId }) => {
//   try {
//     if (!userId) {
//       socket.emit("locationResponse", { error: "User ID is required" });
//       return;
//     }

//     const location = await Location.findOne({ userId }).sort({ createdAt: -1 });

//     if (!location) {
//       socket.emit("locationResponse", { error: "No location found for this user" });
//       return;
//     }

//     socket.emit("locationResponse", {
//       userId: location.userId.toString(), // Ensure string format
//       latitude: location.latitude,
//       longitude: location.longitude,
//       zone: location.zone,
//       timestamp: location.timestamp,
//     });
    
//   } catch (error) {
//     console.error("Error retrieving user location:", error);
//     socket.emit("locationResponse", { error: "Failed to retrieve location. Please try again later." });
//   }
// });


  // socket.on("getUserLocation", async ({ userId }) => {
  //   try {
  //     const location = await Location.findOne({ userId }).sort({ timestamp: -1 });
  
  //     if (!location) {
  //       socket.emit("locationResponse", { error: "No location found" });
  //       return;
  //     }
  
  //     socket.emit("locationResponse", {
  //       userId: location.userId,
  //       latitude: location.latitude,
  //       longitude: location.longitude,
  //       zone: location.zone,
  //       timestamp: location.timestamp,
  //     });
  //   } catch (error) {
  //     console.error("Error getting user location:", error);
  //     socket.emit("locationResponse", { error: "Failed to retrieve location" });
  //   }
  // });

// Get Latest User Location
export const getUserLocation = async (req, res) => {
  try {
    const { userId } = req.params;
    const location = await Location.findOne({ userId }).sort({ timestamp: -1 });

    if (!location) return res.status(404).json({ message: "No location found" });

    res.status(200).json(location);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};




// import { Location } from "../models/locationModel.js";
// import { User } from "../models/user.model.js";

// // Define Zones
// const zones = [
//   { name: "Delhi", lat: 28.7041, lng: 77.1025, radius: 50000 },
//   { name: "Mumbai", lat: 19.0760, lng: 72.8777, radius: 50000 },
//   { name: "Bangalore", lat: 12.9716, lng: 77.5946, radius: 50000 },
// ];

// // Function to Calculate Distance using Haversine Formula
// function getDistance(lat1, lon1, lat2, lon2) {
//   const R = 6371e3; // Earth's radius in meters
//   const toRad = (angle) => (angle * Math.PI) / 180;
  
//   const φ1 = toRad(lat1);
//   const φ2 = toRad(lat2);
//   const Δφ = toRad(lat2 - lat1);
//   const Δλ = toRad(lon2 - lon1);
  
//   const a =
//     Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
//     Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
//   return R * c; // Distance in meters
// }

// // Function to Determine Zone
// function getZone(latitude, longitude) {
//   for (const zone of zones) {
//     const distance = getDistance(latitude, longitude, zone.lat, zone.lng);
//     if (distance < zone.radius) {
//       return zone.name;
//     }
//   }
//   return "Unknown";
// }

// // Function to Save Location
// export const saveLocation = async (req, res) => {
//   try {
//     const { userId, latitude, longitude } = req.body;
//     const zone = getZone(latitude, longitude);

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const location = new Location({ userId, latitude, longitude, zone });
//     await location.save();

//     user.currentLocation = { latitude, longitude, zone };
//     await user.save();

//     res.status(201).json({ message: "Location updated", location });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// // Get User's Latest Location
// export const getUserLocation = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const location = await Location.findOne({ userId }).sort({ timestamp: -1 });

//     if (!location) return res.status(404).json({ message: "No location found" });

//     res.status(200).json(location);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };


// import { Location } from "../models/locationModel.js";
// import { User } from "../models/user.model.js";

// // Define Zones
// const zones = [
//   { name: "Delhi", lat: 28.7041, lng: 77.1025, radius: 50000 },
//   { name: "Mumbai", lat: 19.0760, lng: 72.8777, radius: 50000 },
//   { name: "Bangalore", lat: 12.9716, lng: 77.5946, radius: 50000 },
// ];

// // Function to Determine Zone
// function getZone(latitude, longitude) {
//   for (const zone of zones) {
//     const distance = Math.sqrt(
//       Math.pow(zone.lat - latitude, 2) + Math.pow(zone.lng - longitude, 2)
//     );
//     if (distance < zone.radius / 111000) {
//       return zone.name;
//     }
//   }
//   return "Unknown";
// }

// // Function to Save Location
// export const saveLocation = async (req, res) => {
//   try {
//     const { userId, latitude, longitude } = req.body;
//     const zone = getZone(latitude, longitude);

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const location = new Location({ userId, latitude, longitude, zone });
//     await location.save();

//     user.currentLocation = { latitude, longitude };
//     await user.save();

//     res.status(201).json({ message: "Location updated", location });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// // Get User's Latest Location
// export const getUserLocation = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const location = await Location.findOne({ userId }).sort({ timestamp: -1 });

//     if (!location) return res.status(404).json({ message: "No location found" });

//     res.status(200).json(location);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };
