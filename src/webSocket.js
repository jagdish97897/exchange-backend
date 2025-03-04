import { Server } from "socket.io";
import { isValidToken } from "../utils/validateToken.js";
import { trackLocationUpdates } from "./controllers/trackLocationUpdates.js";
import { User } from './models/user.model.js';
import { Location } from "./models/location.model.js";
import { getZoneFromGooglePlaces, getCellId } from "../utils/location.js";

let io;

const configureSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
        },
    });

    // trackLocationUpdates(io);

    io.on("connection", async (socket) => {
        const token = socket.handshake.query.token;
        const result = isValidToken(token);

        if (result.valid) {
            const roomName = `user-${result.userId}`;
            await socket.join(roomName); // Allow the new socket to join
            console.log(`Socket joined room: ${roomName}`);
            console.log("Socket id:", socket.id);

            // Fetch and log existing sockets in the room
            const existingSockets = await io.in(roomName).fetchSockets();
            console.log("Existing sockets in room:", existingSockets.map((s) => s.id));
        } else {
            console.log("Authentication failed");
            socket.disconnect();
        }

        // Listen for user messages
        socket.on("createMessage", (newMessage) => {
            console.log("New message:", newMessage);
            io.emit("hny", newMessage);
        });

        // Join Room
        socket.on('joinRoom', (room) => {
            socket.join(room);
            console.log(`User ${socket.id} joined room ${room}`);
        });

        // Chat Message
        socket.on('message', ({ room, message }) => {
            io.to(room).emit('message', message);
            console.log(`Message to room ${room}: ${message}`);
        });

        socket.on("saveLocation", async (data) => {
            try {
                const { userId, latitude, longitude } = data;
                const userExists = await User.findById(userId).select("_id");
                if (!userExists) {
                    socket.emit("error", "User not found");
                    return;
                }

                // Use reverse geocoding to determine the zone based on latitude & longitude
                const zone = await getZoneFromGooglePlaces(latitude, longitude);
                const cellId = await getCellId(latitude, longitude);

                // Check if the user already has a location entry
                const existingLocation = await Location.findOne({ userId });
                if (!existingLocation) {
                    const location = new Location({ userId, latitude, longitude, cellId, zone });
                    await location.save();
                } else {
                    await Location.updateOne(
                        { userId },
                        { $set: { latitude, longitude, cellId, zone } }
                    );
                }

                // Update the user's current location
                await User.updateOne(
                    { _id: userId },
                    { $set: { currentLocation: { latitude, longitude, cellId, zone } } }
                );

                // Broadcast the updated location to all connected clients
                io.emit("receiveLocation", { userId, latitude, longitude, zone });
            } catch (error) {
                console.error("Error saving location:", error);
                socket.emit("error", "Failed to save location");
            }
        });


        // Get User Location
        socket.on("getUserLocation", async ({ userId }) => {
            try {
                if (!userId) {
                    return socket.emit("error", "userId is required");
                }

                const location = await Location.findOne({ userId }).select("latitude longitude");

                if (!location) {
                    return socket.emit("error", "User location not found");
                }

                // Send initial location
                socket.emit("receiveUserLocation", {
                    latitude: location.latitude,
                    longitude: location.longitude,
                });

                // Listen for live location updates
                socket.on(`locationUpdate:${userId}`, (data) => {
                    socket.emit("receiveUserLocation", data);
                });

            } catch (error) {
                console.error("Error fetching location:", error);
                socket.emit("error", "Failed to fetch user location");
            }
        });

        // Handle disconnection
        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });

    return io;
};


// Utility function to emit a new message
const emitNewMessage = async (event, userId, trip) => {
    if (!io) {
        console.error("Socket.io is not initialized.");
        return;
    }

    if (!userId) {
        console.error("User ID is required to emit a message.");
        return;
    }

    try {
        const roomName = `user-${userId}`;
        const existingSockets = await io.in(roomName).fetchSockets();
        // console.log(existingSockets, 'exist')

        if (existingSockets.length) {
            io.to(roomName).emit(event, trip);
            console.log(`${event} Message sent to room: ${roomName}`);
        } else {
            console.warn(`Room ${roomName} does not exist.`);
        }
    } catch (error) {
        console.error("Error emitting message:", error);
    }
};

export { configureSocket, emitNewMessage };
