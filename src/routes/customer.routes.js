import express from "express";
import { getCustomerById } from "../controllers/customerController.js";

const router = express.Router();

router.get("/customer/:id", getCustomerById);

export default router;