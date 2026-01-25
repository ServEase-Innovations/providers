import sequelize from "./database.js";

const db = {};
db.sequelize = sequelize;

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