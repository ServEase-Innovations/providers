import express from "express";
import { addVendor } from "../controllers/vendor.controller.js";

const router = express.Router();

router.post('/vendor/add', addVendor);

export default router;