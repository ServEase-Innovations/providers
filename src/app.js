import express from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger/swagger.js";
import providerRoutes from "./routes/provider.routes.js";

const app = express();

app.use(express.json());

app.use("/api/service-providers", providerRoutes);


// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

export default app;
