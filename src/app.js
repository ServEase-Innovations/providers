import express from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger/swagger.js";
import providerRoutes from "./routes/provider.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import vendorRoutes from "./routes/vendor.routes.js";
import errorHandling from "./middleware/errorHandler.js";
import cors from "cors";

const app = express();

app.use(cors());

app.use(express.json());

app.use("/api/service-providers", providerRoutes);
app.use("/api", customerRoutes);
app.use("/api", vendorRoutes);

// Error handling middleware
app.use(errorHandling);

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

export default app;
