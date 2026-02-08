import { getPaginatedProvidersService, getAllProvidersService, addProviderService } from "../services/provider.service.js";
import { getPagination, getPagingData } from "../utils/pagination.util.js";
import responseHandling from "../utils/response.util.js";

export const getPaginatedProviders = async (req, res, next) => {
    try {
        if (!req.query.page || !req.query.size) {
            const providers = await getAllProvidersService();
            return responseHandling(res, 200, "All providers retrieved successfully", providers);
        }
        const { page, size } = req.query;
        const { limit, offset } = getPagination(page, size);
        const data = await getPaginatedProvidersService(limit, offset);
        const response = getPagingData(data, page, limit);
        return responseHandling(res, 200, "Providers retrieved successfully", response);
    } catch (error) {
        next(error);
    }
};

export const addProvider = async (req, res, next) => {
    try {
        const providerData = req.body;
        const provider = await addProviderService(providerData);
        return responseHandling(res, 201, "Provider added successfully", provider);
    } catch (error) {
        next(error);
    }
};