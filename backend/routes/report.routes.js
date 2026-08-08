const controller = require("../controllers/report.controller");
const { verifyToken, isAdmin } = require("../middleware/authJwt");
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
require('dotenv').config();

// Console log to confirm connection string is loaded (optional, but helpful for debugging)
if (process.env.AZURE_STORAGE_CONNECTION_STRING && process.env.AZURE_CONTAINER_NAME) {
    console.log("✅ Azure ENV Configured: Connection string and container loaded.");
} else {
    console.warn("⚠️ Azure ENV Missing: Uploads will fail. Check AZURE_STORAGE_CONNECTION_STRING in .env");
}

// 1. Configure Multer for in-memory storage only (temporary buffer)
const inMemoryStorage = multer.memoryStorage();
const upload = multer({ storage: inMemoryStorage });


// 2. Custom Middleware for Azure Upload
const azureUploadMiddleware = async (req, res, next) => {
    if (!req.file) {
        return next();
    }
    
    // START MODIFIED CODE BLOCK
    try {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        const containerName = process.env.AZURE_CONTAINER_NAME;
        
        if (!connectionString || !containerName) {
            console.error("❌ Azure Upload Error: Connection string or container name is missing.");
            return res.status(500).send({ message: "File upload service is currently unavailable (Missing Azure configuration)." });
        }

        // 1. Create a Blob Service Client
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        
        // 2. Get Container and Blob Client
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // 3. Define unique Blob Name
        const originalname = req.file.originalname || `file-${Date.now()}`;
        const blobName = `${Date.now()}-${originalname.replace(/\s/g, '_')}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        
        // 4. Upload the buffer
        await blockBlobClient.uploadData(req.file.buffer, {
            blobHTTPHeaders: { blobContentType: req.file.mimetype }
        });
        
        // 5. Attach the full public URL to the request for the controller to save
        // Simpler way to get account name if connection string is standard
        const accountMatch = connectionString.match(/AccountName=([^;]*)/);
        const storageAccountName = accountMatch ? accountMatch[1] : 'unknownaccount';
        
        req.file.url = `https://${storageAccountName}.blob.core.windows.net/${containerName}/${blobName}`;
        
        console.log(`⬆️ Azure Upload Success: Blob uploaded to ${req.file.url}`);
        
        next();

    } catch (error) {
        // CRITICAL FIX: Ensure the generic error is logged and returns 500
        console.error("❌ Azure Upload Error:", error.message);
        return res.status(500).send({ message: "Failed to upload file to Azure Storage. Please check server logs." });
    }
    // END MODIFIED CODE BLOCK
};


module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // CRITICALLY MODIFIED ROUTES: All file uploads now go through Azure middleware
  app.post(
    "/api/reports",
    [verifyToken, upload.single('issuePhoto'), azureUploadMiddleware],
    controller.createReport
  );

  // 💡 MODIFICATION 1: DEDICATED ROUTE for non-file status updates (Pending, In Progress, Rejected)
  // This route expects application/json and skips file middleware entirely.
  app.put(
    "/api/reports/:id/status/json",
    [verifyToken], // Removed upload and azure middleware
    controller.updateWorkerStatus
  );

  // 💡 MODIFICATION 2: ORIGINAL ROUTE for Resolution Proof ONLY (Requires file upload)
  app.put(
    "/api/reports/:id/status",
    // This route handles file uploads for RESOLUTION only.
    [verifyToken, upload.single('issuePhoto'), azureUploadMiddleware], 
    controller.updateWorkerStatus
  );
  
  // NEW ROUTE: Supervisor (BBMP Staff) final status control (Rejection/Override)
  app.put("/api/reports/:id/supervise-status", [verifyToken], controller.superviseReportStatus);
  
  // The rest of the routes remain the same, as they don't involve file uploads:
  app.get("/api/reports/all", [verifyToken, isAdmin], controller.getAllReports);
  app.get("/api/reports/my-reports", [verifyToken], controller.getMyReports);
  app.get("/api/reports/staff-reports", [verifyToken], controller.getStaffReports);
  app.get("/api/reports/my-assignments", [verifyToken], controller.getWorkerAssignments);
  app.get("/api/reports/resolved-count", [verifyToken], controller.getResolvedReportsCount);
  
  // FIX: Line 90 might be here, ensure it correctly calls the function
  app.put("/api/reports/assign", [verifyToken], controller.assignReportToWorker);
  app.get("/api/reports/:id", [verifyToken], controller.getReportById); 
};