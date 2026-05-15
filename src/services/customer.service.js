import Customer from "../model/customer.model.js";
import { languageKnownToDb } from "../utils/languageKnown.util.js";

/** Accept legacy lowercase / snake_case keys; Sequelize uses camelCase attributes. */
function normalizeCustomerPayload(data) {
  if (!data || typeof data !== "object") return data;
  const o = { ...data };
  const alias = [
    ["customerid", "customerId"],
    ["firstname", "firstName"],
    ["lastname", "lastName"],
    ["middlename", "middleName"],
    ["emailid", "emailId"],
    ["mobileno", "mobileNo"],
    ["alternateno", "alternateNo"],
    ["buildingname", "buildingName"],
    ["currentlocation", "currentLocation"],
    ["languageknown", "languageKnown"],
    ["enrolleddate", "enrolledDate"],
    ["profilepic", "profilePic"],
    ["idno", "idNo"],
    ["isactive", "isActive"],
    ["pincode", "pinCode"],
  ];
  for (const [legacy, canonical] of alias) {
    if (o[canonical] === undefined && o[legacy] !== undefined) {
      o[canonical] = o[legacy];
    }
    delete o[legacy];
  }
  if (o.languageKnown !== undefined) {
    o.languageKnown = languageKnownToDb(o.languageKnown);
  }
  return o;
}

export const getCustomerByIdService = async (customerId) => {
  /** Full row — callers (profile, Redux) need fields like languageKnown, locality, etc. */
  return await Customer.findByPk(customerId);
};

export const getPaginatedCustomersService = async (limit, offset) => {
    return await Customer.findAndCountAll({
        order: [["customerId", "DESC"]],
        limit,
        offset,
    });
};

export const getAllCustomersService = async () => {
    return await Customer.findAll();
}

export const createCustomerService = async (data) => {
    return await Customer.create(normalizeCustomerPayload(data));
};

export const updateCustomerService = async (customerId, data) => {
  const customer = await Customer.findByPk(customerId);

  if (!customer) {
    return null;
  }

  await customer.update(normalizeCustomerPayload(data));

  return customer;
};