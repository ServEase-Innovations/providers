import { Vendor, Provider } from "../model/index.js";

export const addVendorService = async (vendorData) => {
  return await Vendor.create(vendorData);
};

export const getAllVendorsService = async () => {
  return await Vendor.findAll();
};

export const getVendorByIdService = async (vendorId) => {
  const vendor = await Vendor.findByPk(vendorId, {
    include: [
      {
        model: Provider,
        as: "serviceProviders",
        attributes: [
          "serviceproviderid",
          "firstName",
          "lastName",
          "mobileNo",
          "emailId",
          "housekeepingRole",
          "experience"
        ]
      }
    ]
  });

  return vendor;
};

export const updateVendorService = async (vendorId, vendorData) => {
  const vendor = await Vendor.findByPk(vendorId);

  if (!vendor) {
    return null;
  }

  await vendor.update(vendorData);
  return vendor;
}


