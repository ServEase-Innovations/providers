const otpStore = new Map();

export const setOtpSession = (mobile, payload) => {
  otpStore.set(String(mobile), payload);
};

export const getOtpSession = (mobile) => {
  return otpStore.get(String(mobile));
};

export const clearOtpSession = (mobile) => {
  otpStore.delete(String(mobile));
};
