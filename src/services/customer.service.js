import Customer from "../model/customer.model.js";

export const getCustomerByIdService = async (customerId) => {
    return await Customer.findByPk(customerId, {
        attributes: ['customerid', 'firstname','lastname','emailid','mobileno','alternateno']
    })
};

export const getPaginatedCustomersService = async (limit, offset) => {
    return await Customer.findAndCountAll({
        order: [['customerid', 'DESC']],
        limit,
        offset,
    });
};

export const getAllCustomersService = async () => {
    return await Customer.findAll();
}