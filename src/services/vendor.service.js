import Vendor from "../model/vendor.model.js";

export const addVendorService = async (vendorData) => {
  return await Vendor.create(vendorData);
};

export const getAllVendorsService = async () => {
  return await Vendor.findAll();
};

export const getVendorByIdService = async (vendorId) => {
  return await Vendor.findByPk(vendorId);
};