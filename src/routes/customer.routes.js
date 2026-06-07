import express from "express";
import { getCustomerById, getPaginatedCustomers, createCustomer, updateCustomer } from "../controllers/customer.controller.js";
import {
  authenticateRead,
  loadActor,
  requireAdminRead,
  requireOwnCustomerId,
} from "../middleware/resourceAccess.js";

const router = express.Router();

router.get(
  "/customer/:id",
  authenticateRead,
  loadActor,
  requireOwnCustomerId("id"),
  getCustomerById
);
router.get(
  "/customers",
  authenticateRead,
  loadActor,
  requireAdminRead,
  getPaginatedCustomers
);
router.post("/customer", createCustomer);
router.put("/customer/:id", updateCustomer);

export default router;