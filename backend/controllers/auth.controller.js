// File: auth.controller.js

const Citizen = require("../models/user.model"); // Renamed to Citizen Model
const BBMPStaff = require("../models/bbmpstaff.model"); // NEW
const WorkerUser = require("../models/workeruser.model"); // NEW
const WorkerModelFactory = require("../models/worker.model"); // MODIFIED: Import model factory
const Area = require("../models/area.model"); // Import Area model for lookup
const { getWorkerModelForArea } = require("../helpers/user.helper"); // 💡 MODIFIED: Use centralized helper
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require('dotenv').config();

// NEW: Import the Firebase Admin SDK initialized file
const admin = require('../config/firebaseAdmin');
// END NEW

// Helper function to normalize area name for deterministic credentials
function cleanAreaName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// NEW FUNCTION: Get the total count of Citizen accounts (for landing page stat)
exports.getCitizenCount = async (req, res) => {
    try {
        // Use estimatedDocumentCount() for fastest total document count
        const count = await Citizen.estimatedDocumentCount(); // Queries citizenslogin
        res.status(200).json({ count });
    } catch (err) {
        console.error("Error fetching citizen count:", err);
        res.status(500).send({ message: "Failed to count citizens." });
    }
};

// --- NEW REWARD SYSTEM FUNCTIONS ---

// NEW FUNCTION: Get Citizen Rank and Score
exports.getCitizenRewardData = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await Citizen.findById(userId).select('rewardPoints reportsSubmitted');

        if (!user) {
            return res.status(404).send({ message: "Citizen not found." });
        }

        // Calculate Rank based on rewardPoints (Higher points = lower rank number)
        // Aggregation to find rank
        const higherScoringUsers = await Citizen.countDocuments({
            rewardPoints: { $gt: user.rewardPoints }
        });

        // Rank is 1 + count of users with strictly higher scores
        const rank = higherScoringUsers + 1;

        res.status(200).json({
            rewardPoints: user.rewardPoints,
            reportsSubmitted: user.reportsSubmitted,
            rank: rank
        });

    } catch (err) {
        console.error("Error fetching citizen reward data:", err);
        res.status(500).send({ message: "Failed to fetch reward data." });
    }
};

// NEW FUNCTION: Get Worker Rank and Score
exports.getWorkerRewardData = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await WorkerUser.findById(userId).select('resolutionPoints resolvedReportsCount');

        if (!user) {
            return res.status(404).send({ message: "Worker not found." });
        }
        
        // Calculate Rank based on resolutionPoints (Higher points = lower rank number)
        const higherScoringUsers = await WorkerUser.countDocuments({
            resolutionPoints: { $gt: user.resolutionPoints }
        });
        
        // Rank is 1 + count of users with strictly higher scores
        const rank = higherScoringUsers + 1;

        res.status(200).json({
            resolutionPoints: user.resolutionPoints,
            resolvedReportsCount: user.resolvedReportsCount,
            rank: rank
        });

    } catch (err) {
        console.error("Error fetching worker reward data:", err);
        res.status(500).send({ message: "Failed to fetch reward data." });
    }
};

// --- END NEW REWARD SYSTEM FUNCTIONS ---

// User Signup (Citizen only) - MODIFIED FOR FIREBASE
exports.signup = async (req, res) => {
  try {
    const { fullName, email, password, aadhaarNumber } = req.body;

    // 1. Validate password strength (Firebase requires at least 6 characters)
    if (!password || password.length < 6) {
        return res.status(400).send({ message: "Password must be at least 6 characters." });
    }

    // --- FIREBASE USER CREATION ---
    // 2. Create the user in Firebase Auth.
    const firebaseUser = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: fullName,
      emailVerified: false, 
    });

    // 3. Send the verification email using the Firebase Admin SDK.
    // **CRITICAL FIX: Removed Admin SDK email sending. The Client SDK will handle this.**
    // const actionCodeSettings = {
    //     // Redirect back to the Citizen sign-in page after verification
    //     url: 'http://localhost:8080/citizen-login-page', 
    //     handleCodeInApp: true,
    // };
    // Firebase generates and sends the link to the provided email
    // await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);

    // --- MONGODB RECORD CREATION ---
    // 4. Store the Citizen record in MongoDB, using the Firebase UID as the _id.
    const citizen = new Citizen({
      _id: firebaseUser.uid, // CRITICAL: Use Firebase UID as Mongoose _id for linking
      fullName,
      email,
      // Mongoose schema requires a password field, so we use a placeholder:
      password: 'FIREBASE_MANAGED', 
      aadhaarNumber, // Phone number passed as Aadhaar for demographic ID
      rewardPoints: 0, // Initialize reward points
      reportsSubmitted: 0, // Initialize submitted reports
    });

    await citizen.save();

    // 5. Return success message
    res.status(201).send({ 
        // **UPDATED MESSAGE: Prompts user to proceed to login to trigger verification.**
        message: "Account created successfully! Please proceed to login to trigger verification.",
        uid: firebaseUser.uid 
    });

  } catch (err) {
    if (err.code && err.code.startsWith('auth/')) {
        // Translate common Firebase errors
        let message = err.message.replace('Firebase: ', '');
        if (err.code === 'auth/email-already-in-use') message = "Account with this email already exists.";
        return res.status(409).send({ message: message });
    }
    // Catch Mongoose error for unique Aadhaar number (11000)
    if (err.code === 11000) { 
        return res.status(409).send({ message: "Account with this Aadhaar/ID already exists." });
    }
    res.status(500).send({ message: err.message });
  }
};

// MODIFIED: Worker/BBMP Account Creation (Admin Feature)
exports.createBBMPAccount = async (req, res) => {
    try {
        // NOTE: fullName removed from worker mode expectation
        const { workerId, areaId, areaName, workerDocumentName } = req.body; 

        const isDeterministicAreaMode = !!areaId && !!areaName && !workerId; // BBMP Staff Mode (AreaId present, WorkerId absent)
        
        let Model, finalId, finalName, finalEmail, finalPassword;
        let workerDocumentAreaId = null; // Stores the Area ID if in worker mode

        if (isDeterministicAreaMode) {
            // --- BBMP STAFF MODE (Stored in bbmplogin) ---
            Model = BBMPStaff; 
            
            const extractedAreaName = areaName;
            finalId = areaId; // Area ID is the desired value for both _id and area fields
            finalName = `BBMP Staff - ${extractedAreaName}`; 
            
            const cleanedName = cleanAreaName(extractedAreaName);
            
            // **FIXED LOGIC:** Use @municipalcorporation.in for Staff account (matching frontend)
            finalEmail = `${cleanedName}@municipalcorporation.in`; // ⬅️ MODIFIED DOMAIN
            finalPassword = `${cleanedName}@123`;

        } else {
            // --- BBMP WORKER MODE (Stored in workerlogin) ---
            // Removed dependency on passed fullName. Now uses workerDocumentName (worker's name).
            if (!workerId || !areaName || !workerDocumentName) { 
                return res.status(400).send({ message: "Worker ID, Staff Area Name, and Worker Document Name are required." });
            }
            Model = WorkerUser;

            const Worker = getWorkerModelForArea(areaName); 
            
            // 1. Validate the worker entry exists and get the Area ID (workerDocument.area)
            const workerEntry = await Worker.findById(workerId).select('name area');
            if (!workerEntry) {
                 return res.status(400).send({ message: `Worker document not found for ID ${workerId}.` });
            }
            workerDocumentAreaId = workerEntry.area; // Store the Area ID

            // 2. CRITICAL FIX: Generate credentials based on First Name and Area Name
            
            // Get the first word of the worker's name (e.g., "demo3")
            const workerFirstName = workerDocumentName.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            
            // Get the cleaned Area Name (e.g., "belagavi")
            const cleanedAreaName = cleanAreaName(areaName); 

            finalId = workerId; // Worker User's 'area' field holds the Worker Document ID
            
            // CRITICAL FIX: Use the worker document name as the full name
            finalName = workerDocumentName; 
            
            // **FIXED LOGIC:** Use firstName.areaName@municipalcorporation.in
            finalEmail = `${workerFirstName}.${cleanedAreaName}@municipalcorporation.in`; 
            
            // **FIXED LOGIC:** Use firstName@123 (matching screenshot's password format)
            finalPassword = `${workerFirstName}@123`;
        }
        
        const aadhaarNumber = finalId.slice(0, 12); 

        // Find the user by their assigned area (which is the finalId) in the specific model/collection
        let user = await Model.findOne({ area: finalId });
        let isNewUser = false;

        if (user) {
            // Update existing user
            user.fullName = finalName; 
            user.email = finalEmail; 
            user.password = bcrypt.hashSync(finalPassword, 8); 
            user.aadhaarNumber = aadhaarNumber; 
            user.area = finalId; // Stays the same (Worker Document ID or Area ID)
            // CRITICAL FIX: Update the new areaId field for WorkerUser
            if (Model === WorkerUser && workerDocumentAreaId) {
                user.areaId = workerDocumentAreaId;
            }
            await user.save();
        } else {
            // Create new user
            let userObj = {
                // CRITICAL FIX: Assign the AreaId/WorkerDocId as the Mongoose _id to satisfy schema requirement
                _id: finalId, 
                fullName: finalName,
                email: finalEmail,
                password: bcrypt.hashSync(finalPassword, 8),
                aadhaarNumber,
                area: finalId, // Link user to the Area/Worker ID
            };

            // CRITICAL FIX: Set the new areaId field for WorkerUser on creation
            if (Model === WorkerUser && workerDocumentAreaId) {
                userObj.areaId = workerDocumentAreaId;
            }
            
            user = new Model(userObj);
            await user.save();
            isNewUser = true;
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: 86400, // 24 hours
        });

        const statusMessage = isNewUser 
            ? "Account provisioned successfully!" 
            : "Account credentials reset successfully!";

        return res.status(isNewUser ? 201 : 200).send({ 
            message: statusMessage, 
            user: { 
                id: user._id, 
                fullName: user.fullName, 
                email: user.email, 
                password: finalPassword, 
                workerId: finalId, 
            },
            accessToken: token 
        });

    } catch (err) {
        if (err.code === 11000) {
             return res.status(409).send({ message: "A user with this unique ID already exists in this collection." });
        }
        // Log the validation error for clarity
        console.error("BBMP/Worker Account Creation Error:", err); 
        res.status(500).send({ message: err.message });
    }
};

// MODIFIED: Password Reset
exports.resetBBMPPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).send({ message: "Email and new password are required." });
    }

    // Must check all BBMP collections since we don't know the user's collection yet
    let user = await BBMPStaff.findOne({ email: email }).select('password area');
    if (!user) {
        // Reads from test.workerlogin
        user = await WorkerUser.findOne({ email: email }).select('password area');
    }

    if (!user) { 
        return res.status(404).send({ message: "Staff/Worker account not found." });
    }
    
    user.password = bcrypt.hashSync(newPassword, 8);
    await user.save();

    res.status(200).send({ message: "Password updated successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// CRITICAL MODIFICATION: Signin - Now verifies Firebase ID Token for Citizen login
exports.signin = async (req, res) => {
  try {
    const { email, password, isCitizenLogin, isBBMPLogin, isWorkerLogin } = req.body;
    let user = null;
    let role = 'Unknown';
    let Model = null;
    let passwordIsValid = false; // Initialize for non-Citizen roles

    // 1. Determine Login Type
    if (isCitizenLogin) {
        // --- CITIZEN LOGIN VIA FIREBASE (TOKEN-BASED) ---
        
        // Expect Firebase ID Token in the Authorization header from the frontend
        const authHeader = req.headers['authorization'];
        const firebaseIdToken = authHeader?.split(' ')[1];
        
        if (!firebaseIdToken) {
             return res.status(401).send({ message: "Firebase ID token required for Citizen sign-in." });
        }
        
        // 2. Verify Firebase ID Token and User Status (Admin SDK)
        const decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
        const firebaseUid = decodedToken.uid;
        
        if (!decodedToken.email_verified) {
             // Block login if email is not verified
             return res.status(403).send({ message: "Access Denied: Please verify your email address first." });
        }
        
        // 3. Lookup Citizen in MongoDB by UID (which is now the MongoDB _id)
        user = await Citizen.findById(firebaseUid).select('-password'); 
        
        if (!user) {
             return res.status(404).send({ message: "Citizen record not found in database. Please sign up again." });
        }
        
        Model = Citizen;
        role = 'Citizen';
        passwordIsValid = true; // Token verification implies successful password check
        
    } else {
        // --- BBMP/WORKER LOGIN (Existing Custom Logic) ---
        
        // 1. Determine which collection to search based on the login form used (Fast Lookup)
        if (isBBMPLogin) {
            Model = BBMPStaff;
            role = 'BBMP';
        } else if (isWorkerLogin) {
            Model = WorkerUser; // Reads from test.workerlogin
            role = 'Worker';
        } else {
            // Fallback for unexpected case (check all non-Firebase models)
            user = await BBMPStaff.findOne({ email: email });
            if (!user) user = await WorkerUser.findOne({ email: email });
        }

        // 2. Perform Lookup using the determined Model 
        if (Model && !user) {
            // The populate option for BBMPStaff will fail if the 'area' field is referencing a non-existent ObjectId or an Area ID that has been incorrectly cast to a String ID.
            if (Model === BBMPStaff) {
                 user = await Model.findOne({ email: email }).populate("area", "name");
            } else if (Model === WorkerUser) {
                 user = await Model.findOne({ email: email }); 
            }
        }

        if (!user) {
          return res.status(404).send({ message: "User Not found in the selected portal." });
        }

        passwordIsValid = bcrypt.compareSync(password, user.password);

        if (!passwordIsValid) {
          return res.status(401).send({ accessToken: null, message: "Invalid Password!" });
        }
    }

    if (!user) {
        return res.status(404).send({ message: "User Not found in the selected portal." });
    }
    
    // 3. Final Role Validation (Security Check)
    if (isCitizenLogin && role !== 'Citizen') {
        return res.status(403).send({ accessToken: null, message: "Unauthorized: Staff/Worker accounts cannot use the Citizen portal." });
    }
    if ((isBBMPLogin || isWorkerLogin) && (role !== 'BBMP' && role !== 'Worker')) {
        return res.status(403).send({ accessToken: null, message: "Unauthorized: Citizen accounts cannot access this portal." });
    }
    
    // --- CRITICAL FIX: Worker Provisioning Check & Manual Population ---
    let workerArea = null;
    let areaIdForResponse = null;

    if (role === 'Worker') {
        // user.areaId holds the Area ObjectId (new field)
        areaIdForResponse = user.areaId; 
        
        if (!areaIdForResponse) {
             return res.status(403).send({ accessToken: null, message: "This account is not provisioned for the Worker Portal. (No Area ID linked)" });
        }
        
        // Lookup Area Name using the direct Area ID link
        workerArea = await Area.findById(areaIdForResponse).select('name');
        
        if (!workerArea) {
             return res.status(403).send({ accessToken: null, message: "This account is not provisioned for the Worker Portal. (Area not found)" });
        }
    }
    // --- END CRITICAL FIX ---


    // 5. Token Generation and Response
    const token = jwt.sign({ id: user.id, role: role }, process.env.JWT_SECRET, {
      expiresIn: 86400, // 24 hours
    });
    
    // Determine the area ID and Name for the response
    let areaId, areaName;

    if (role === 'Worker') {
        // Use the new efficient method
        areaId = areaIdForResponse; 
        areaName = workerArea.name;
    } else {
        // Use the Mongoose populated data (BBMPStaff) or null (Citizen)
        areaId = user.area ? user.area._id : null;
        areaName = user.area ? user.area.name : null;
    }

    res.status(200).send({
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      accessToken: token,
      areaId: areaId, 
      areaName: areaName, 
      role: role, 
    });
  } catch (err) {
    // Handle specific Firebase token verification errors (e.g., expired token)
    if (err.code && err.code.startsWith('auth/')) {
         return res.status(401).send({ message: err.message.replace('Firebase: ', '') });
    }
    res.status(500).send({ message: err.message });
  }
};