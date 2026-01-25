import sequelize from "./database.js";
import Customer from "../model/customer.model.js";
import Provider from "../model/provider.model.js";

const db = {};
db.sequelize = sequelize;
db.Customer = Customer;
db.Provider = Provider;

(async () => {
    try {
        await db.sequelize.authenticate();
        await db.sequelize.sync({ alter: true });
        console.log("Database connected successfully.");
    } catch (error) {
        console.error("Unable to connect to the database:", error);
    }
})();

export default db;