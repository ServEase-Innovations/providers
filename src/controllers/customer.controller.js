import { getCustomerByIdService, getPaginatedCustomersService, getAllCustomersService } from "../services/customer.service.js";
import { getPagination, getPagingData } from "../utils/pagination.util.js";
import responseHandling from "../utils/response.util.js";

export const getCustomerById = async (req, res, next) => {
    try {
        const customerId = req.params.id;
        const customer = await getCustomerByIdService(customerId);
        if (!customer) {
            return responseHandling(res, 404, "Customer not found");
        }
        return responseHandling(res, 200, "Customer retrieved successfully", customer);
    } catch (error) {
        next(error);
    }
};

export const getPaginatedCustomers = async (req, res, next) => {
    try {
        if (!req.query.page || !req.query.size) {
            const customers = await getAllCustomersService();
            return responseHandling(res, 200, "All customers retrieved successfully", customers);
        }
        const { page, size } = req.query;
        const { limit, offset } = getPagination(page, size);
        const data = await getPaginatedCustomersService(limit, offset);
        const response = getPagingData(data, page, limit);
        return responseHandling(res, 200, "Customers retrieved successfully", response);
    } catch (error) {
        next(error);
    }
};