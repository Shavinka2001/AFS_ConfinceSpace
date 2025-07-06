const express = require("express");
const cors = require("cors");
const proxy = require("express-http-proxy");
const { applyRateLimiter } = require("./utils/rateLimitter")
const app = express();
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3000','http://4.236.138.4','http://localhost:8080'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
//host.docker.internal
// app.use("/api/users", applyRateLimiter, proxy("host.docker.internal:5001"));
app.use("/api/users", applyRateLimiter, proxy("http://auth:5001"));
app.use("/api/auth", applyRateLimiter, proxy("http://auth:5001"));
app.use(
  "/api/order",
  applyRateLimiter,
  proxy("http://confined-space:5002")
);
// app.use(
//   "/api/locations",
//   applyRateLimiter,
//   proxy("http://location-service:5003")
// );

//Exporting app to be used by the server.js
module.exports = app;