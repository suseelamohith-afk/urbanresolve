const controller = require("../controllers/auth.controller");
const { verifyToken, isAdmin } = require("../middleware/authJwt");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.post("/api/auth/signup", controller.signup);
  app.post("/api/auth/signin", controller.signin);
  
  // Public route for Citizen Count
  app.get("/api/auth/citizen-count", controller.getCitizenCount);
  
  // --- NEW REWARD SYSTEM ROUTES ---
  // Get logged-in citizen's score and rank
  app.get("/api/auth/citizen-rewards", [verifyToken], controller.getCitizenRewardData);
  
  // Get logged-in worker's score and rank
  app.get("/api/auth/worker-rewards", [verifyToken], controller.getWorkerRewardData);
  // --- END NEW REWARD SYSTEM ROUTES ---
  
  // Admin features for BBMP Staff
  app.post("/api/auth/bbmp-create", [verifyToken, isAdmin], controller.createBBMPAccount);
  app.post("/api/auth/bbmp-reset-password", [verifyToken], controller.resetBBMPPassword);
};