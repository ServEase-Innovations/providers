import db from "../config/db.js";
export const getPaginatedProvidersService = async (limit, offset) => {
    return await db.Provider.findAndCountAll({
        order: [['serviceproviderid', 'DESC']],
        limit,
        offset,
    });
};

export const getAllProvidersService = async () => {
    return await db.Provider.findAll();
}