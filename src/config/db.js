import sequelize from "./database.js";
import Customer from "../model/customer.model.js";

const db = {};
db.sequelize = sequelize;
db.Customer = Customer;

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