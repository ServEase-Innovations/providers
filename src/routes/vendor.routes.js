import express from "express";
import {
  addVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
} from "../controllers/vendor.controller.js";

const router = express.Router();

router.post("/vendor/add", addVendor);
router.get("/vendors", getAllVendors);
router.get("/vendor/:id", getVendorById);
router.put("/vendor/:id", updateVendor);

export default router;