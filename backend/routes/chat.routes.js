const controller = require("../controllers/chat.controller");
// No verifyToken needed as the Chatbot is public (or you can add it if needed)
// const { verifyToken } = require("../middleware/authJwt"); 

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    // Endpoint for all chat requests
    app.post("/api/chat", controller.handleChat);
};