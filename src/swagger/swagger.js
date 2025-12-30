import swaggerJSDoc from "swagger-jsdoc";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Servease API",
      version: "1.0.0",
    },
  },
  apis: [
    "./src/routes/*.js",
    "./src/swagger/*.js"   // ✅ THIS IS REQUIRED
  ],
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);
