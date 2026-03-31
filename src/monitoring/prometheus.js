import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestDurationMs = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in milliseconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000],
  registers: [register],
});

export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

export const apiErrorsTotal = new client.Counter({
  name: "api_errors_total",
  help: "Total API errors by code and route",
  labelNames: ["method", "route", "status_code", "code"],
  registers: [register],
});

export const providerActionsTotal = new client.Counter({
  name: "provider_actions_total",
  help: "Provider action operations by action and result",
  labelNames: ["action", "result"],
  registers: [register],
});

export const observeHttpRequest = ({ method, route, statusCode, durationMs }) => {
  const labels = {
    method,
    route,
    status_code: String(statusCode),
  };
  httpRequestsTotal.inc(labels);
  httpRequestDurationMs.observe(labels, durationMs);
};

export const observeApiError = ({ method, route, statusCode, code }) => {
  apiErrorsTotal.inc({
    method,
    route,
    status_code: String(statusCode),
    code,
  });
};

export const observeProviderAction = ({ action, result }) => {
  providerActionsTotal.inc({ action, result });
};

export const getMetrics = async () => register.metrics();
export const metricsContentType = register.contentType;
