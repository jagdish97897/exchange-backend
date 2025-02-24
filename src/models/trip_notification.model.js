import mongoose from "mongoose";

const tripNotificationSchema = mongoose.Schema({
    trip: {
        type: mongoose.Types.ObjectId,
        ref: "Trip",
        required: true
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    }
},
    { timestamps: true }
);

export const TripNotification = mongoose.model('TripNotification', tripNotificationSchema);