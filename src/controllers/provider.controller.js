import {
  getPaginatedProvidersService,
  getAllProvidersService,
  addProviderService,
    getProviderByIdService,
    updateProviderService
} from "../services/provider.service.js";
import { getPagination, getPagingData } from "../utils/pagination.util.js";
import responseHandling from "../utils/response.util.js";
import Address from "../model/address.model.js";

const attachAddresses = async (provider) => {
  const raw = provider?.toJSON ? provider.toJSON() : provider;
  if (!raw) return raw;

  const [correspondenceAddress, permanentAddress] = await Promise.all([
    raw.correspondence_address_id
      ? Address.findByPk(raw.correspondence_address_id)
      : null,
    raw.permanent_address_id ? Address.findByPk(raw.permanent_address_id) : null,
  ]);

  const result = {
    ...raw,
    correspondenceAddress: correspondenceAddress
      ? correspondenceAddress.toJSON()
      : null,
    permanentAddress: permanentAddress ? permanentAddress.toJSON() : null,
  };

  // Hide FK fields from API response (still exist in DB)
  delete result.correspondence_address_id;
  delete result.permanent_address_id;

  return result;
};

export const getPaginatedProviders = async (req, res, next) => {
    try {
        if (!req.query.page || !req.query.size) {
            const providers = await getAllProvidersService();
            const hydrated = await Promise.all(
              providers.map((p) => attachAddresses(p))
            );
            return responseHandling(
              res,
              200,
              "All providers retrieved successfully",
              hydrated
            );
        }
        const { page, size } = req.query;
        const { limit, offset } = getPagination(page, size);
        const data = await getPaginatedProvidersService(limit, offset);
        const response = getPagingData(data, page, limit);
        response.results = await Promise.all(
          (response.results || []).map((p) => attachAddresses(p))
        );
        return responseHandling(res, 200, "Providers retrieved successfully", response);
    } catch (error) {
        next(error);
    }
};

export const addProvider = async (req, res, next) => {
    try {
        const providerData = req.body;
        const provider = await addProviderService(providerData);
        const hydrated = await attachAddresses(provider);
        return responseHandling(res, 201, "Provider added successfully", hydrated);
    } catch (error) {
        next(error);
    }
};

export const getProviderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const provider = await getProviderByIdService(id);

    if (!provider) {
      return responseHandling(res, 404, "Provider not found");
    }

    const hydrated = await attachAddresses(provider);
    return responseHandling(res, 200, "Provider retrieved successfully", hydrated);
  } catch (error) {
    next(error);
  }
};

export const updateProvider = async (req, res, next) => {
  try {
    const { id } = req.params;
    const providerData = req.body;

    const updatedProvider = await updateProviderService(id, providerData);

    if (!updatedProvider) {
      return responseHandling(res, 404, "Provider not found");
    }

    return responseHandling(
      res,
      200,
      "Provider updated successfully",
      updatedProvider
    );
  } catch (error) {
    next(error);
  }
};