import express from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger/swagger.js";
import providerRoutes from "./routes/provider.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import vendorRoutes from "./routes/vendor.routes.js";
import authRoutes from "./routes/auth.routes.js";
import errorHandling from "./middleware/errorHandler.js";
import requestMetrics from "./middleware/requestMetrics.js";
import { getMetrics, metricsContentType } from "./monitoring/prometheus.js";

import {logger} from "./utils/logger.js";

import cors from "cors";


const app = express();
app.use(requestMetrics);
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["*"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());

app.get("/metrics", async (req, res, next) => {
  try {
    res.set("Content-Type", metricsContentType);
    res.end(await getMetrics());
  } catch (error) {
    next(error);
  }
});


app.use("/api/service-providers", providerRoutes);
app.use("/api", customerRoutes);
app.use("/api", vendorRoutes);
app.use("/api/auth", authRoutes);


// Error handling middleware
app.use(errorHandling);

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

export default app;
