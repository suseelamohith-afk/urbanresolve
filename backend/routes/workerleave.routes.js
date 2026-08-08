const controller = require("../controllers/workerleave.controller");
const { verifyToken } = require("../middleware/authJwt");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Route for BBMP staff to record worker leave (Feature B)
  app.post("/api/worker-leaves", [verifyToken], controller.applyWorkerLeave);
  
  // NEW Route for BBMP staff to view applied leaves in their area (Feature C)
  app.get("/api/worker-leaves/my-area", [verifyToken], controller.getWorkerLeaves);
};