import app from "./app.js";
import cors from "cors";
import { connectDB } from "./config/database.js";
import { bootstrapSchemaFromDevDb } from "./scripts/bootstrapFromDevDb.js";
import { patchProviderSchema } from "./scripts/patchProviderSchema.js";

const PORT = process.env.PORT || 4000;

app.use(cors());

const startServer = async () => {
  await connectDB();

  if (process.env.BOOTSTRAP_SCHEMA_FROM_DEV === "true") {
    console.log("ℹ️ BOOTSTRAP_SCHEMA_FROM_DEV=true, bootstrapping target schema...");
    await bootstrapSchemaFromDevDb();
  }

  if (process.env.APPLY_PROVIDER_SCHEMA_PATCH !== "false") {
    await patchProviderSchema();
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
  });
};

startServer().catch((err) => {
  console.error("❌ Failed to start server:", err.message);
  process.exit(1);
});
