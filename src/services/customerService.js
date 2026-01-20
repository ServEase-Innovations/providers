import db from "../config/db.js";

export const getCustomerByIdService = async (customerId) => {
    return await db.Customer.findByPk(customerId, {
        attributes: ['customerid', 'firstname','lastname','emailid']
    })
};
    