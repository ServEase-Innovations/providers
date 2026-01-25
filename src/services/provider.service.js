import db from "../config/db.js";
import Provider from "../model/provider.model.js";
export const getPaginatedProvidersService = async (limit, offset) => {
    return await Provider.findAndCountAll({
        order: [['serviceproviderid', 'DESC']],
        limit,
        offset,
    });
};

export const getAllProvidersService = async () => {
    return await Provider.findAll();
}