// config/firebaseAdmin.js
const admin = require("firebase-admin");
require('dotenv').config();

// Parse the secure JSON key from the environment variable (FIREBASE_SERVICE_ACCOUNT_KEY)
let serviceAccount;
try {
    // CRITICAL: Parse the secure JSON string from the .env file.
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} catch (e) {
    console.error("❌ FATAL: Could not parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure the entire JSON is on one line in .env.", e);
    process.exit(1); 
}

// Initialize the Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // databaseURL is optional unless you're using Realtime DB or Cloud Firestore
});

// Export the initialized admin object so other controllers can use it
module.exports = admin;