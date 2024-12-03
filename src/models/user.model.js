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
            unique: true,
            sparse: true,
            lowercase: true,
            trim: true,
        },
        phoneNumber: {
            type: String,
            required: [true, "Phone Number is required"],
            trim: true,
            unique: true,
        },
        type: {
            type: String,
            enum: ["consumer", "transporter", "owner", "broker", "driver"],
            required: true,
        },
        gstin: {
            type: String,
            required: function () { return this.type === "consumer"; },
            uppercase: true,
            validate: {
                validator: function (value) {
                    if (this.type === "consumer") {
                        return value && value.length > 0;
                    }
                    return true;
                },
                message: "GSTIN is required for consumers",
            },
        },
        aadharNumber: {
            type: String,
            required: function () { return ["transporter", "owner", "broker", "driver"].includes(this.type); },
            validate: {
                validator: function (value) {
                    if (["transporter", "owner", "broker", "driver"].includes(this.type)) {
                        return value && value.length > 0;
                    }
                    return true;
                },
                message: "Aadhar number is required",
            },
        },
        panNumber: {
            type: String,
            required: function () { return ["transporter", "owner", "broker", "driver"].includes(this.type); },
            uppercase: true,
            validate: {
                validator: function (value) {
                    if (["transporter", "owner", "broker", "driver"].includes(this.type)) {
                        return value && value.length > 0;
                    }
                    return true;
                },
                message: "PAN number is required",
            },
            unique: true,
            sparse: true, // Allows multiple null values
        },
        dlNumber: {
            type: String,
            required: function () { return this.type === "driver"; },
            uppercase: true,
            validate: {
                validator: function (value) {
                    if (this.type === "driver") {
                        return value && value.length > 0;
                    }
                    return true;
                },
                message: "Driving License Number is required for drivers",
            },
        },
        companyName: {
            type: String,
            required: function () { return this.type === "consumer"; },
            trim: true,
        },
        website: {
            type: String,
            required: function () { return this.type === "consumer"; },
            trim: true,
        },
        dob: {
            type: Date,
            required: function () { return ["transporter", "driver"].includes(this.type); },
        },
        gender: {
            type: String,
            enum: ["male", "female", "other"],
            required: function () { return ["transporter", "driver"].includes(this.type); },
            uppercase: true,
            unique: true,
            sparse: true, // Allows multiple null values
        },
        otp: {
            type: Number,
        },
        otpExpires: {
            type: Date,
        },
        status: {
            type: String, enum: ["online", "offline"],
            default: "offline"
        },
        vehicle: {
            type: mongoose.Schema.Types.ObjectId,
            required: false
        },
        currentLocation: {
            type: {
                latitude: {
                    type: Number,
                    required: true
                },
                longitude: {
                    type: Number,
                    required: true
                },
            },
        }
    },
    {
        timestamps: true,
    }
);

export const User = mongoose.model("User", userSchema);
