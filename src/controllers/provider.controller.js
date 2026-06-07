import {
  getPaginatedProvidersService,
  getAllProvidersService,
  addProviderService,
  getProviderByIdService,
  updateProviderService
} from "../services/provider.service.js";
import { deleteProviderCascade } from "../services/providerDeleteCascade.service.js";
import { getPagination, getPagingData } from "../utils/pagination.util.js";
import responseHandling from "../utils/response.util.js";
import Address from "../model/address.model.js";
import ServiceProviderRole from "../model/serviceProviderRole.model.js"; // ✅ added import
import { languageKnownToArray } from "../utils/languageKnown.util.js";
import {
  redactProviderForPublic,
  redactProviderList,
} from "../utils/responseRedaction.js";

function toEpochOrNull(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

const attachAddresses = async (provider) => {
  const raw = provider?.toJSON ? provider.toJSON() : provider;
  if (!raw) return raw;

  // Fetch addresses
  const [correspondenceAddress, permanentAddress] = await Promise.all([
    raw.correspondenceAddressId
      ? Address.findByPk(raw.correspondenceAddressId)
      : null,
    raw.permanentAddressId ? Address.findByPk(raw.permanentAddressId) : null,
  ]);

  // ✅ Fetch roles for this provider
  const roles = await ServiceProviderRole.findAll({
    where: { serviceProviderId: raw.serviceProviderId },
    attributes: ["role"],
    raw: true,
  });
  const housekeepingRoles = roles.map(r => r.role);

  const result = {
    ...raw,
    // Legacy UI / admin grids expect snake-case id + isactive
    serviceproviderid: raw.serviceProviderId ?? raw.serviceproviderid,
    isactive:
      raw.isActive !== undefined && raw.isActive !== null
        ? Boolean(raw.isActive)
        : raw.isactive !== undefined && raw.isactive !== null
          ? Boolean(raw.isactive)
          : true,
    languageKnown: languageKnownToArray(raw.languageKnown),
    dob_epoch: toEpochOrNull(raw.dob),
    enrolled_date_epoch: toEpochOrNull(raw.enrolledDate),
    correspondenceAddress: correspondenceAddress
      ? correspondenceAddress.toJSON()
      : null,
    permanentAddress: permanentAddress ? permanentAddress.toJSON() : null,
    housekeepingRoles, // ✅ attach the roles array
  };

  // Hide FK fields from API response (still exist in DB)
  delete result.correspondenceAddressId;
  delete result.permanentAddressId;

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
        redactProviderList(hydrated)
      );
    }
    const { page, size } = req.query;
    const { limit, offset } = getPagination(page, size);
    const data = await getPaginatedProvidersService(limit, offset);
    const response = getPagingData(data, page, limit);
    response.results = redactProviderList(
      await Promise.all((response.results || []).map((p) => attachAddresses(p)))
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
    const provider = await getProviderByIdService(Number(id));

    if (!provider) {
      return responseHandling(res, 404, "Provider not found");
    }

    const hydrated = await attachAddresses(provider);
    return responseHandling(
      res,
      200,
      "Provider retrieved successfully",
      redactProviderForPublic(hydrated)
    );
  } catch (error) {
    next(error);
  }
};

export const updateProvider = async (req, res, next) => {
  try {
    const { id } = req.params;
    const providerData = req.body;

    const updatedProvider = await updateProviderService(Number(id), providerData);

    if (!updatedProvider) {
      return responseHandling(res, 404, "Provider not found");
    }

    const hydrated = await attachAddresses(updatedProvider);
    return responseHandling(
      res,
      200,
      "Provider updated successfully",
      hydrated
    );
  } catch (error) {
    next(error);
  }
};

export const deleteProvider = async (req, res, next) => {
  try {
    const { id } = req.params;
    const summary = await deleteProviderCascade(Number(id));
    if (!summary) {
      return responseHandling(res, 404, "Provider not found");
    }
    return responseHandling(res, 200, "Provider deleted permanently", summary);
  } catch (error) {
    next(error);
  }
};