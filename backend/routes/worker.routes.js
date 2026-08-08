const controller = require("../controllers/worker.controller");
const { verifyToken, isAdmin } = require("../middleware/authJwt");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Get all workers list (used in BBMP dashboard for assignment/management)
  app.get("/api/workers", [verifyToken], controller.getWorkers);
  
  // NEW ROUTE: Get top rewarded workers for the staff's area
  app.get("/api/workers/top-rewards", [verifyToken], controller.getTopWorkersByReward);

  // Routes for BBMP Staff to manage the worker list (RESTORED)
  app.post("/api/workers", [verifyToken], controller.addWorker); 
  app.delete("/api/workers/:id", [verifyToken], controller.removeWorker);
};