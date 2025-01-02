import { Server } from "socket.io";
import { isValidToken } from "../utils/validateToken.js";

let io; 

const configureSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", 
        },
    });

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
        console.log(existingSockets, 'exist')

        if (existingSockets.length) {
            io.to(roomName).emit(event, trip);
            console.log(`Message sent to room: ${roomName}`);
        } else {
            console.warn(`Room ${roomName} does not exist.`);
        }
    } catch (error) {
        console.error("Error emitting message:", error);
    }
};

export { configureSocket, emitNewMessage };
