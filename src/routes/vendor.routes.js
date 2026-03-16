import express from "express";
import {
  addVendor,
  getAllVendors,
  getVendorById,
} from "../controllers/vendor.controller.js";

const router = express.Router();

router.post("/vendor/add", addVendor);
router.get("/vendors", getAllVendors);
router.get("/vendor/:id", getVendorById);

export default router;