import Vendor from "./vendor.model.js";
import Provider from "./provider.model.js";
import ServiceProviderRole from "./serviceProviderRole.model.js";

// 🔗 Define associations here
Vendor.hasMany(Provider, {
  foreignKey: "vendorId",
  as: "serviceProviders",
});

Provider.belongsTo(Vendor, {
  foreignKey: "vendorId",
  as: "vendor",
});

Provider.hasMany(ServiceProviderRole, {
  foreignKey: "serviceProviderId",
  sourceKey: "serviceProviderId",
  as: "roles",
});

ServiceProviderRole.belongsTo(Provider, {
  foreignKey: "serviceProviderId",
  targetKey: "serviceProviderId",
});

// Export all models
export {
  Vendor,
  Provider,
  ServiceProviderRole,
};