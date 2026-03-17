import {
  addVendorService,
  getAllVendorsService,
  getVendorByIdService,
} from "../services/vendor.service.js";
import { getProvidersByVendorIdService } from "../services/provider.service.js";
import responseHandling from "../utils/response.util.js";

export const addVendor = async (req, res, next) => {
  try {
    const vendorData = req.body;
    const vendor = await addVendorService(vendorData);
    return responseHandling(res, 201, "Vendor added successfully", vendor);
  } catch (error) {
    next(error);
  }
};

export const getAllVendors = async (req, res, next) => {
  try {
    const vendors = await getAllVendorsService();
    return responseHandling(res, 200, "Vendors fetched successfully", vendors);
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
      ...vendor.toJSON(),
      providers,
    });
  } catch (error) {
    next(error);
  }
};