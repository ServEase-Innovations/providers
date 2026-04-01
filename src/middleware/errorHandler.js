import { observeApiError } from "../monitoring/prometheus.js";
import { logger } from "../utils/logger.js";

const errorHandler = (err, req, res, next) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const status = err.status || 500;
  const code = err.code || "INTERNAL_ERROR";

  // Prometheus metric
  observeApiError({
    method: req.method,
    route: req.route?.path || req.path || "/unknown",
    statusCode: status,
    code,
  });

  // File + console logging
  logger.error("[api.error]", {
    requestId,
    method: req.method,
    path: req.originalUrl,
    status,
    code,
    message: err.message,
  });

  // Response
  res.status(status).json({
    success: false,
    code,
    message: err.userMessage || "Something went wrong. Please try again.",
    debugMessage: err.message || "Internal Server Error",
    requestId,
    errors: err.errors || null
  });
};

export default errorHandler;
