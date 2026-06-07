import {
  addVendorService,
  getAllVendorsService,
  getVendorByIdService,
  updateVendorService,
} from "../services/vendor.service.js";
import { getProvidersByVendorIdService } from "../services/provider.service.js";
import responseHandling from "../utils/response.util.js";
import {
  redactProviderForPublic,
  redactVendorForPublic,
} from "../utils/responseRedaction.js";

function toEpochOrNull(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

/** Align Sequelize camelCase with legacy admin / agent UI field names. */
function formatProviderForLegacyUi(provider) {
  const raw = provider?.toJSON ? provider.toJSON() : provider;
  if (!raw) return raw;
  return {
    ...raw,
    serviceproviderid: raw.serviceProviderId ?? raw.serviceproviderid,
    isactive:
      raw.isActive !== undefined && raw.isActive !== null
        ? Boolean(raw.isActive)
        : raw.isactive !== undefined && raw.isactive !== null
          ? Boolean(raw.isactive)
          : true,
    dob_epoch: toEpochOrNull(raw.dob),
    enrolled_date_epoch: toEpochOrNull(raw.enrolledDate),
  };
}

function formatVendorWithEpoch(vendor) {
  const raw = vendor?.toJSON ? vendor.toJSON() : vendor;
  if (!raw) return raw;
  return {
    ...raw,
    created_date_epoch: toEpochOrNull(raw.createdDate),
  };
}

export const addVendor = async (req, res, next) => {
  try {
    const vendorData = req.body;
    const vendor = await addVendorService(vendorData);
    return responseHandling(
      res,
      201,
      "Vendor added successfully",
      formatVendorWithEpoch(vendor)
    );
  } catch (error) {
    next(error);
  }
};

export const getAllVendors = async (req, res, next) => {
  try {
    const vendors = await getAllVendorsService();
    return responseHandling(
      res,
      200,
      "Vendors fetched successfully",
      vendors.map(formatVendorWithEpoch).map(redactVendorForPublic)
    );
  } catch (error) {
    next(error);
  }
};

export const getVendorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendor = await getVendorByIdService(id);

    if (!vendor) {
      return responseHandling(res, 404, "Vendor not found");
    }

    const providers = await getProvidersByVendorIdService(vendor.vendorId);

    return responseHandling(res, 200, "Vendor fetched successfully", {
      ...redactVendorForPublic(formatVendorWithEpoch(vendor)),
      providers: providers
        .map(formatProviderForLegacyUi)
        .map(redactProviderForPublic),
    });
  } catch (error) {
    next(error);
  }
};
export const updateVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorData = req.body;

    const vendor = await updateVendorService(id, vendorData);

    if (!vendor) {
      return responseHandling(res, 404, "Vendor not found");
    }

    return responseHandling(
      res,
      200,
      "Vendor updated successfully",
      formatVendorWithEpoch(vendor)
    );
  } catch (error) {
    next(error);
  }
};