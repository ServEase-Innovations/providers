import { sendOtpService, verifyOtpService } from "../services/otp.service.js";
import responseHandling from "../utils/response.util.js";

export const sendOtp = async (req, res, next) => {
  try {
    const { mobile } = req.body;
    const data = await sendOtpService(mobile);
    return responseHandling(res, 200, "OTP sent successfully.", data);
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { mobile, otp } = req.body;
    const data = await verifyOtpService({ mobile, otp });
    return responseHandling(res, 200, "OTP verified successfully.", data);
  } catch (error) {
    next(error);
  }
};
