import Vendor from "../model/vendor.model.js";

export const addVendorService = async (vendorData) => {
    return await Vendor.create(vendorData);
}