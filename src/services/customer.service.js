import db from "../config/db.js";

export const getCustomerByIdService = async (customerId) => {
    return await db.Customer.findByPk(customerId, {
        attributes: ['customerid', 'firstname','lastname','emailid','mobileno','alternateno']
    })
};

export const getPaginatedCustomersService = async (limit, offset) => {
    return await db.Customer.findAndCountAll({
        order: [['customerid', 'DESC']],
        limit,
        offset,
    });
};

export const getAllCustomersService = async () => {
    return await db.Customer.findAll();
}