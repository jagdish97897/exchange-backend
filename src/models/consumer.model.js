import mongoose, { Schema } from "mongoose";

const consumerSchema = new Schema(
    {
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ["consumer", "transporter"],
            required: true
        },
        phoneNumber: {
            type: Number,
            required: [true, "Phone Number is required"],
            unique: true,
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
        },
        pan: {
            type: String,
            validate: {
                validator: function (value) {
                    if (this.type === 'transporter') {
                        return value && value.length > 0;
                    }
                    return true;
                },
                message: "PAN is required for transporters"
            },
        },
        companyName: {
            type: String,
            required: true
        },
        website: {
            type: String,
            required: true
        },

    },
    {
        timestamps: true
    }
)


export const Consumer = mongoose.model("Consumer", consumerSchema);