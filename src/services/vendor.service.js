import { Vendor, Provider } from "../model/index.js";

function toDateFromEpochSeconds(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(Math.floor(n) * 1000);
}

function normalizeVendorPayload(vendorData) {
  const data = { ...(vendorData || {}) };
  if (data.createdDate === undefined && data.created_date_epoch !== undefined) {
    data.createdDate = toDateFromEpochSeconds(data.created_date_epoch);
  }
  delete data.created_date_epoch;
  return data;
}

export const addVendorService = async (vendorData) => {
  return await Vendor.create(normalizeVendorPayload(vendorData));
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
          "serviceProviderId",
          "firstName",
          "lastName",
          "mobileNo",
          "emailId",
          "housekeepingRole",
          "experience",
        ],
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

  await vendor.update(normalizeVendorPayload(vendorData));
  return vendor;
}


