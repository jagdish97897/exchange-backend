import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        profileImage: {
            type: String, 
            required: false,
        },
        email: {
            type: String,
            required: false,
            // unique: true,
            sparse: true, 
            lowercase: true,
            trim: true,
        },
        phoneNumber: {
            type: Number,
            required: [true, "Phone Number is required"],
            trim: true,
            unique: true,
        },
        type: {
            type: String,
            enum: ["consumer", "transporter", "owner", "broker", "driver"],
            required: true
        },

        gstin: {
            type: String,
            validate: {
                validator: function (value) {
                    if (this.type === 'consumer') {
                        return value && value.length > 0;
                    }
                    return true;
                },
                message: "GSTIN is required for consumers"
            },
            uppercase: true,
            // unique: true,
            sparse: true, // Allows multiple null values
        },
        aadhar: {
            type: String,
            validate: {
                validator: function (value) {
                    if (this.type !== 'consumer') {
                        return value && value.length > 0;
                    }
                    return true;
                },
                message: "Aadhar is required"
            },
            // unique: true,
            sparse: true, // Allows multiple null values
        },
        pan: {
            type: String,
            validate: {
                validator: function (value) {
                    if (this.type !== 'consumer') {
                        return value && value.length > 0;
                    }
                    return true;
                },
                message: "PAN is required"
            },
            uppercase: true,
            // unique: true,
            sparse: true, // Allows multiple null values
        },
        dlNumber: {
            type: String,
            validate: {
                validator: function (value) {
                    if (this.type === 'driver') {
                        return value && value.length > 0;
                    }
                    return true;
                },
                message: "DrivingLicence Number is required"
            },
            uppercase: true,
            // unique: true,
            sparse: true, 
        },
    },
    {
        timestamps: true
    }
)


export const User = mongoose.model("User", userSchema);



// import mongoose, { Schema } from "mongoose";

// const userSchema = new Schema(
//     {
//         fullName: {
//             type: String,
//             required: true,
//             trim: true,
//         },
//         profileImage: {
//             type: String, // cloudinary url
//             required: false,
//         },
//         email: {
//             type: String,
//             required: [false, "Email is required"],
//             unique: true,
//             lowercase: true,
//             trim: true,
//         },
//         phoneNumber: {
//             type: Number,
//             required: [true, "Phone Number is required"],
//             trim: true,
//             unique: true,
//         },
//         type: {
//             type: String,
//             enum: ["consumer", "transporter", "owner", "broker", "driver"],
//             required: true
//         },
//         gstin: {
//             type: String,
//             validate: {
//                 validator: function (value) {
//                     if (this.type === 'consumer') {
//                         return value && value.length > 0;
//                     }
//                     return true;
//                 },
//                 message: "GSTIN is required for consumers"
//             },
//             uppercase: true,
//             unique: true,
//             required: false
//         },
//         aadhar: {
//             type: String,
//             validate: {
//                 validator: function (value) {
//                     if (this.type !== 'consumer') {
//                         return value && value.length > 0;
//                     }
//                     return true;
//                 },
//                 message: "Aadhar is required"
//             },
//             unique: true,
//             required: false
//         },
//         pan: {
//             type: String,
//             validate: {
//                 validator: function (value) {
//                     if (this.type !== 'consumer') {
//                         return value && value.length > 0;
//                     }
//                     return true;
//                 },
//                 message: "PAN is required "
//             },
//             uppercase: true,
//             unique: true,
//             required: false
//         },
//         dlNumber: {
//             type: String,
//             validate: {
//                 validator: function (value) {
//                     if (this.type === 'driver') {
//                         return value && value.length > 0;
//                     }
//                     return true;
//                 },
//                 message: "DrivingLicence Number is required"
//             },
//             uppercase: true,
//             unique: true,
//             required: false
//         },
//         companyName: {
//             type: String,
//             required: false
//         },
//         website: {
//             type: String,
//             required: false
//         },
//     },
//     {
//         timestamps: true
//     }
// )


// export const User = mongoose.model("User", userSchema);