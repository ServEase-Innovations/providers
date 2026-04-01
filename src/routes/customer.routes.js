import express from "express";
import { getCustomerById, getPaginatedCustomers, createCustomer, updateCustomer } from "../controllers/customer.controller.js";

const router = express.Router();

router.get('/customer/:id', getCustomerById);
router.get('/customers', getPaginatedCustomers);
router.post("/customer", createCustomer);
router.put("/customer/:id", updateCustomer);

export default router;