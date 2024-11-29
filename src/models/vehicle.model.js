import mongoose, { Schema } from "mongoose";

const vehicleSchema = new Schema(
  {
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (value) {
          // Basic validation for vehicle number format (e.g., "AB12CD3456")
          return /^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/.test(value);
        },
        message: "Invalid vehicle number format",
      },
    },
    rcCopy: {
      type: [String],
      required: true,
      validate: {
        validator: function (value) {
          return value.length > 0;
        },
        message: "At least one RC copy is required",
      },
    },
    height: {
      type: String,
      required: true,
      trim: true,
    },
    width: {
      type: String,
      required: true,
      trim: true,
    },
    length: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    broker: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    latitude: {
      type: Number,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
    },
    biddingAuthorization: {
      type: Boolean,
      default: false,
    },
    tdsDeclaration: {
      type: String,
      trim: true,
    },
    ownerConsent: {
      type: String,
      required: false,
    },
    brokerConsent: {
      type: String,
      required: false,
    },
    // Nested driver object
    driver: {
      fullName: {
        type: String,
        required: false,
      },
      profileImage: {
        type: String,
        required: false,
      },
      email: {
        type: String,
        required: false,
      },
      phoneNumber: {
        type: String,
        required: false,
      },
      aadharNumber: {
        type: String,
        required: false,
      },
      panNumber: {
        type: String,
        required: false,
      },
      dlNumber: {
        type: String,
        required: false,
      },
      dob: {
        type: String,
        required: false,
      },
      gender: {
        type: String,
        enum: ["male", "female", "other"],
        required: false,
      },
    },
  },
  {
    timestamps: true,
  }
);
export const Vehicle = mongoose.model("Vehicle", vehicleSchema);


// import mongoose, { Schema } from "mongoose";
// const vehicleSchema = new Schema(
//     {
//       vehicleNumber: {
//         type: String,
//         required: true,
//         unique: true,
//         trim: true,
//         uppercase: true,
//         validate: {
//           validator: function (value) {
//             // Basic validation for vehicle number format (e.g., "AB12CD3456")
//             return /^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/.test(value);
//           },
//           message: "Invalid vehicle number format",
//         },
//       },
//       rcCopy: {
//         type: [String],
//         required: true,
//         validate: {
//           validator: function (value) {
//             return value.length > 0;
//           },
//           message: "At least one RC copy is required",
//         },
//       },
//       height: {
//         type: String,
//         required: true,
//         trim: true,
//       },
//       width: {
//         type: String,
//         required: true,
//         trim: true,
//       },
//       length: {
//         type: String,
//         required: true,
//         trim: true,
//       },
//       owner: {
//         type: Schema.Types.ObjectId,
//         ref: "User", // Reference to the User model
//         required: true,
//       },
//       broker: {
//         type: Schema.Types.ObjectId,
//         ref: "User", // Reference to the User model
//         required: false, // Optional if an owner directly adds the vehicle
//       },
//       latitude: {
//         type: Number,
//         required: false,
//         min: -90,
//         max: 90,
//         validate: {
//           validator: function (value) {
//             return !isNaN(value);
//           },
//           message: "Latitude must be a number between -90 and 90",
//         },
//       },
//       longitude: {
//         type: Number,
//         required: false,
//         min: -180,
//         max: 180,
//         validate: {
//           validator: function (value) {
//             return !isNaN(value);
//           },
//           message: "Longitude must be a number between -180 and 180",
//         },
//       },
//       biddingAuthorization: {
//         type: Boolean,
//         default: false,
//       },
//       tdsDeclaration: {
//         type: String,
//         required: false,
//         trim: true,
//       },
//       ownerConsent: {
//         type: String, // Changed from Boolean to String
//         required: false,
//     },
//     brokerConsent: {
//         type: String, // Changed from Boolean to String
//         required: false,
//     },
//     },
//     {
//       timestamps: true, 
//     }
//   );
  
//   export const Vehicle = mongoose.model("Vehicle", vehicleSchema);
  