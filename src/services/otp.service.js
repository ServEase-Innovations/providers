import crypto from "crypto";
import Customer from "../model/customer.model.js";
import { clearOtpSession, getOtpSession, setOtpSession } from "./otp.store.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_INTERVAL_MS = 30 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

const createAppError = (message, status = 400, code = "BAD_REQUEST") => {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.userMessage = message;
  return error;
};

const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
};

const generateOtp = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const normalizeMobile = (mobile) => String(mobile || "").replace(/\D/g, "");

const sendOtpViaProvider = async ({ mobile, otp }) => {
  const providerBaseUrl =
    process.env.OTP_PROVIDER_URL || "http://46.4.104.219/vb/apikey.php";

  const apiKey = process.env.OTP_PROVIDER_API_KEY || "qa9KzTcZGbVkwggk";
  const senderId = process.env.OTP_PROVIDER_SENDER_ID || "SERVSO";
  const templateId =
    process.env.OTP_PROVIDER_TEMPLATE_ID || "1707173841824763666";
  const templateMessage =
    process.env.OTP_PROVIDER_MESSAGE_TEMPLATE ||
    "Dear User, ServEaso: Welcome To ServEaso - an active and seamless home care service provider. Your Verification OTP Code is otp and valid for 10 mins. - ServEaso Team";

  const message = templateMessage.replace(/otp/gi, otp);
  const requestUrl = new URL(providerBaseUrl);
  requestUrl.searchParams.set("apikey", apiKey);
  requestUrl.searchParams.set("senderid", senderId);
  requestUrl.searchParams.set("number", mobile);
  requestUrl.searchParams.set("templateid", templateId);
  requestUrl.searchParams.set("message", message);

  const response = await fetch(requestUrl.toString(), { method: "GET" });
  if (!response.ok) {
    throw new Error(`OTP provider failed with status ${response.status}`);
  }

  let providerResponse;
  try {
    providerResponse = await response.json();
  } catch {
    providerResponse = null;
  }

  if (providerResponse?.status !== "Success") {
    throw new Error(
      providerResponse?.description || "OTP provider did not accept request."
    );
  }

  return {
    delivered: true,
    providerMessageId: providerResponse?.data?.messageid || null,
  };
};

export const sendOtpService = async (mobileInput) => {
  const mobile = normalizeMobile(mobileInput);
  if (!/^\d{10}$/.test(mobile)) {
    throw createAppError(
      "Please provide a valid 10-digit mobile number.",
      400,
      "INVALID_MOBILE"
    );
  }

  const customer = await Customer.findOne({ where: { mobileno: mobile } });
  if (!customer) {
    throw createAppError(
      "No customer found for this mobile number.",
      404,
      "CUSTOMER_NOT_FOUND"
    );
  }

  const existingSession = getOtpSession(mobile);
  if (
    existingSession &&
    Date.now() - existingSession.lastSentAt < RESEND_INTERVAL_MS
  ) {
    throw createAppError(
      "Please wait before requesting another OTP.",
      429,
      "OTP_RATE_LIMITED"
    );
  }

  const otp = generateOtp();
  setOtpSession(mobile, {
    otpHash: hashOtp(otp),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    customerId: customer.customerid,
    lastSentAt: Date.now(),
  });

  await sendOtpViaProvider({ mobile, otp });

  const response = {
    mobile,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
  };

  if (!process.env.OTP_PROVIDER_URL || process.env.NODE_ENV !== "production") {
    response.devOtp = otp;
  }

  return response;
};

export const verifyOtpService = async ({ mobile: mobileInput, otp }) => {
  const mobile = normalizeMobile(mobileInput);
  const session = getOtpSession(mobile);

  if (!session) {
    throw createAppError(
      "OTP not requested or already expired.",
      400,
      "OTP_SESSION_NOT_FOUND"
    );
  }

  if (Date.now() > session.expiresAt) {
    clearOtpSession(mobile);
    throw createAppError(
      "OTP expired. Please request a new OTP.",
      400,
      "OTP_EXPIRED"
    );
  }

  if (session.attempts >= MAX_VERIFY_ATTEMPTS) {
    clearOtpSession(mobile);
    throw createAppError(
      "Too many invalid attempts. Request a new OTP.",
      429,
      "OTP_ATTEMPTS_EXCEEDED"
    );
  }

  if (hashOtp(otp) !== session.otpHash) {
    session.attempts += 1;
    setOtpSession(mobile, session);
    throw createAppError("Invalid OTP.", 401, "OTP_INVALID");
  }

  const customer = await Customer.findByPk(session.customerId, {
    attributes: ["customerid", "firstname", "lastname", "emailid", "mobileno"],
  });

  clearOtpSession(mobile);

  return {
    token: crypto.randomBytes(24).toString("hex"),
    role: "CUSTOMER",
    customer,
  };
};
