const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// REMOVED LINE: app.use('/uploads', express.static('uploads')); // Serve uploaded files statically

// Set port
const PORT = process.env.PORT || 8080;

// ⚙️ FIX: MongoDB Connection with enhanced error logging
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Successfully connect to MongoDB.");
    
    // Start the server ONLY after the database successfully connects
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}.`);
    });

    // NEW ERROR HANDLING: If the port is in use, try the next one.
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            const newPort = PORT + 1;
            console.warn(`Port ${PORT} is busy, trying port ${newPort}...`);
            
            // Stop the current server listener and restart on the new port
            server.close(() => {
                server.listen(newPort, () => {
                    console.log(`Server is now running on port ${newPort}.`);
                });
            });
        } else {
            // Re-throw other errors
            throw err;
        }
    });
  })
  .catch((err) => {
    // ⚠️ CRITICAL: Ensure the server exits if the DB connection fails
    console.error("❌ FATAL: MongoDB Connection error. Check MONGO_URI in .env", err.message);
    process.exit(1); // Exit with a failure code
  });
  
// Handle MongoDB connection errors after initial connection
mongoose.connection.on('error', err => {
    console.error('❌ MongoDB Runtime Error:', err.message);
});

require("./routes/auth.routes")(app);
require("./routes/report.routes")(app);
require("./routes/area.routes")(app);
require("./routes/worker.routes")(app); 
require("./routes/assignment.routes")(app); 
require("./routes/workerleave.routes")(app); 

// MODIFICATION: Import the new chat routes
require("./routes/chat.routes")(app); 

// Serve static frontend files
// NOTE: Change '../frontend' to the actual name of your frontend folder!
app.use(express.static(path.join(__dirname, '../frontend')));

// Catch-all route to send the HTML file
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});