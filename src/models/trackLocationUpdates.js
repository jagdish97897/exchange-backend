
import { Location } from "./locationModel.js";

export function trackLocationUpdates(io) {
  const locationChangeStream = Location.watch();


  locationChangeStream.on("change", (change) => {
    if (change.operationType === "update" || change.operationType === "replace") {
      const updatedFields = change.updateDescription?.updatedFields;
      const userId = change.documentKey._id;

      if (updatedFields?.latitude && updatedFields?.longitude) {
        io.emit(`locationUpdate:${userId}`, {
          latitude: updatedFields.latitude,
          longitude: updatedFields.longitude,
        });
      }
    }
  });

  locationChangeStream.on("error", (err) => {
    console.error("Error in location change stream:", err);
  });
}


// const mongoose = require("mongoose");
// const Location = require("./models/Location");

// function trackLocationUpdates(io) {
//   const locationChangeStream = Location.watch();

//   locationChangeStream.on("change", (change) => {
//     if (change.operationType === "update" || change.operationType === "replace") {
//       const updatedFields = change.updateDescription?.updatedFields;
//       const userId = change.documentKey._id;

//       if (updatedFields?.latitude && updatedFields?.longitude) {
//         io.emit(`locationUpdate:${userId}`, {
//           latitude: updatedFields.latitude,
//           longitude: updatedFields.longitude,
//         });
//       }
//     }
//   });

//   locationChangeStream.on("error", (err) => {
//     console.error("Error in location change stream:", err);
//   });
// }

// module.exports = trackLocationUpdates;
