


// index.js

import 'dotenv/config'
import connectDB from "./db/index.js";
import { server } from './app.js';


// MongoDB connection and starting the server
connectDB()
    .then(() => {
        server.listen(process.env.PORT || 8000, () => {
            console.log(`⚙️ Server is running at port : ${process.env.PORT || 8000}`);
        });
    })
    .catch((err) => {
        console.log("MONGO db connection failed!!!", err);
    });


// import 'dotenv/config'
// import connectDB from "./db/index.js";
// import { app } from './app.js';
// import http from 'http';
// // import configureSocket from "./webSocket.js";
// import { Server } from "socket.io";


// const server = http.createServer(app);

// const io = new Server(server, {
//     cors: {
//         origin: '*',  // Allow connections from any origin
//         methods: ["GET", "POST"]
//     }
// });

// io.on("connection", (socket) => {
//     console.log('A client connected:', socket.id);

//     // Emit message from server to user
//     socket.emit("newMessage", {
//         from: "jen@mds",
//         text: "hepppp",
//         createdAt: 123,
//     });

//     // Listen for message from user
//     socket.on("createMessage", (newMessage) => {
//         console.log("newMessage", newMessage);
//     });

//     // When server disconnects from user
//     socket.on("disconnect", () => {
//         console.log("A client disconnected", socket.id);
//     });

//     // return io;
// });

// connectDB()
//     .then(() => {
//         // configureSocket(server);
//         server.listen(process.env.PORT || 8000, () => {
//             console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
//         })
//     })
//     .catch((err) => {
//         console.log("MONGO db connection failed !!! ", err);
//     })



/*
import express from "express"
const app = express()
( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("errror", (error) => {
            console.log("ERRR: ", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })

    } catch (error) {
        console.error("ERROR: ", error)
        throw err
    }
})()

*/