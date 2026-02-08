import Provider from "../model/provider.model.js";
import Address from "../model/address.model.js";
import { sequelize } from "../config/database.js"; 

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

export const addProviderService = async (providerData) => {
    const transaction = await sequelize.transaction();
    const {
      permanentaddress,
      correspondenceaddress,
      ...serviceproviderdata
    } = providerData;
    const correspondence = await Address.create(
        correspondenceaddress,
        { transaction }
    );

    const permanent  = await Address.create(
        permanentaddress,
        { transaction }
    );

    const provider = await Provider.create(
        {
            ...serviceproviderdata,
            permanent_address_id: permanent.id,
            correspondence_address_id: correspondence.id
        },
        { transaction }
    );
    await transaction.commit();
    return provider;
}