import { addVendorService } from "../services/vendor.service.js";
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