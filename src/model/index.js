import Vendor from "./vendor.model.js";
import Provider from "./provider.model.js";

// 🔗 Define associations here
Vendor.hasMany(Provider, {
  foreignKey: "vendorId",
  as: "serviceProviders",
});

Provider.belongsTo(Vendor, {
  foreignKey: "vendorId",
  as: "vendor",
});

// Export all models
export {
  Vendor,
  Provider
};