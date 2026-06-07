import express from "express";
import { sequelize } from "../config/database.js";

const router = express.Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "providers",
    uptime: process.uptime(),
  });
});

router.get("/ready", async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({ status: "ready", service: "providers" });
  } catch (err) {
    res.status(503).json({
      status: "not_ready",
      service: "providers",
      error: err?.message || "database unreachable",
    });
  }
});

export default router;
