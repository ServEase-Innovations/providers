import express from "express";
import { getCustomerById, getPaginatedCustomers } from "../controllers/customer.controller.js";

const router = express.Router();

router.get('/customer/:id', getCustomerById);
router.get('/customers', getPaginatedCustomers);

export default router;