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
export const updateVendorService = async (vendorId, vendorData) => {
  const vendor = await Vendor.findByPk(vendorId);

  if (!vendor) {
    return null;
  }

  await vendor.update(vendorData);
  return vendor;
};