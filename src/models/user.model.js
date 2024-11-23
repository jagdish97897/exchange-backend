import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        profileImage: {
            type: String, // cloudinary url
            required: false,
        },
        email: {
            type: String,
            required: false,
            unique: true,
            sparse: true, // Allows multiple null values
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
            unique: true,
            sparse: true, // Allows multiple null values
        },
        aadharNumber: {
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
            unique: true,
            sparse: true, // Allows multiple null values
        },
        panNumber: {
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
            unique: true,
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
            unique: true,
            sparse: true, // Allows multiple null values
        },
        dob: {
            type: Date,
            required: false
        },
        gender: {
            type: String,
            required: false
        },
        otp: {
            type: Number,
            required: false
        },
        otpExpires: {
            type: Date,
            required: false
        }
    },
    {
        timestamps: true
    }
)


export const User = mongoose.model("User", userSchema);