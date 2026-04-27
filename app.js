const path = require("path");
const express = require("express");
const errorMiddleware = require("./middleware/error.middleware.js");
const routes = require("./routes/index.route");

const app = express();

app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true }))
app.use("/public", express.static(path.join(__dirname, "uploads")));


app.use("/api/v1", routes);
// For testing purpose
app.get("/", (req, res) => { res.send("Hello world"); })
app.use(errorMiddleware);


module.exports = app;