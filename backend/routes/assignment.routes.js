const controller = require("../controllers/assignment.controller");
const { verifyToken, isAdmin } = require("../middleware/authJwt");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });
  
  // Internal API endpoint for running the assignment process (e.g., Cron job)
  app.post("/api/assignment/run", [verifyToken, isAdmin], controller.runAutomaticAssignment);
};