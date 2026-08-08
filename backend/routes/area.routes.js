const controller = require("../controllers/area.controller");
const { verifyToken, isAdmin } = require("../middleware/authJwt");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Public route for all users (citizens and admins) to fetch area list
  app.get("/api/areas", controller.getAreas);

  // FIX: Restoring authorization to protect Admin area management routes
  app.post("/api/areas", [verifyToken, isAdmin], controller.addArea); 
  app.delete("/api/areas/:id", [verifyToken, isAdmin], controller.removeArea);
};