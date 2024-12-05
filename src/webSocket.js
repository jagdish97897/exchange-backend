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

        // // Emit message from server to user
        // socket.emit("newMessage", {
        //     from: "jen@mds",
        //     text: "hepcxgvhjk",
        //     createdAt: 123,
        // });

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

    return io; // Return the io instance if needed elsewhere
};

export { configureSocket };