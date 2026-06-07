import { getCustomerByIdService, getPaginatedCustomersService, getAllCustomersService,createCustomerService,updateCustomerService } from "../services/customer.service.js";
import { getPagination, getPagingData } from "../utils/pagination.util.js";
import responseHandling from "../utils/response.util.js";
import { observeProviderAction } from "../monitoring/prometheus.js";
import { logger } from "../utils/logger.js";
import { languageKnownToArray } from "../utils/languageKnown.util.js";
import { redactCustomerList } from "../utils/responseRedaction.js";

function toEpochOrNull(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

function customerToResponse(customer) {
  const j = customer?.toJSON ? customer.toJSON() : customer;
  if (!j) return j;
  return {
    ...j,
    languageKnown: languageKnownToArray(j.languageKnown),
    enrolled_date_epoch: toEpochOrNull(j.enrolledDate),
  };
}


export const getCustomerById = async (req, res, next) => {
    try {
        const customerId = req.params.id;
        const customer = await getCustomerByIdService(customerId);
        if (!customer) {
            observeProviderAction({ action: "get_customer_by_id", result: "not_found" });
            
            return responseHandling(res, 404, "Customer not found");
        }
        observeProviderAction({ action: "get_customer_by_id", result: "found" });
        return responseHandling(res, 200, "Customer retrieved successfully", customerToResponse(customer));
        
    } catch (error) {
        observeProviderAction({ action: "get_customer_by_id", result: "error" });
        next(error);
    }
};

export const getPaginatedCustomers = async (req, res, next) => {
    try {
        if (!req.query.page || !req.query.size) {
            const customers = await getAllCustomersService();
            const formatted = customers.map((c) => customerToResponse(c));
            return responseHandling(res, 200, "All customers retrieved successfully", formatted);
        }
        const { page, size } = req.query;
        const { limit, offset } = getPagination(page, size);
        const data = await getPaginatedCustomersService(limit, offset);
        const response = getPagingData(data, page, limit);
        response.results = redactCustomerList(
          (response.results || []).map((c) => customerToResponse(c))
        );
        observeProviderAction({ action: "get_paginated_customers", result: "success" });
        return responseHandling(res, 200, "Customers retrieved successfully", response);
    } catch (error) {
        observeProviderAction({ action: "get_paginated_customers", result: "error" });
        next(error);
    }
};

export const createCustomer = async (req, res, next) => {
    try {
        const customerData = req.body;

        const customer = await createCustomerService(customerData);
        observeProviderAction({ action: "create_customer", result: "success" });

        return responseHandling(
            res,
            201,
            "Customer created successfully",
            customerToResponse(customer)
        );
    } catch (error) {
        observeProviderAction({ action: "create_customer", result: "error" });
        next(error);
    }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const customerId = req.params.id;
    const customerData = req.body;

    const updatedCustomer = await updateCustomerService(customerId, customerData);

      if (!updatedCustomer) {
        observeProviderAction({ action: "update_customer", result: "not_found" });
      return responseHandling(res, 404, "Customer not found");
    }

    observeProviderAction({ action: "update_customer", result: "success" });
    return responseHandling(
      res,
      200,
      "Customer updated successfully",
      customerToResponse(updatedCustomer)
    );
  } catch (error) {
    observeProviderAction({ action: "update_customer", result: "error" });
    next(error);
  }
};