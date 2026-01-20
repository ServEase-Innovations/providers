import { getCustomerByIdService } from "../services/customerService.js";
import responseHandling from "../utils/responseHandler.js";

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