// socket.js
import { Server } from "socket.io";

const configureSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*", // Replace with your client URL
        }
    });

    io.on("connection", (socket) => {
        console.log('A client connected:', socket.id);


        socket.emit("hny", {
            from: "jen",
            text: "ttttttttjk",
            createdAt: 909,
        });

        // Listen for message from user
        socket.on("createMessage", (newMessage) => {
            console.log("newMessage", newMessage);
            io.emit("hny", newMessage);
        });

        // When server disconnects from user
        socket.on("disconnect", () => {
            console.log("A client disconnected", socket.id);
        });
    });

    return io; 
};

export { configureSocket };