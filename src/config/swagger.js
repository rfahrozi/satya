const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SATYA API',
      version: '2.1.0',
      description: 'API Documentation untuk Sistem Administrasi dan Tata Kelola Yudisial yang Akuntabel (SATYA) - Pengadilan Tinggi Kepulauan Riau.',
    },
    servers: [
      {
        url: '/satya/api/v1',
        description: 'SATYA API v1',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Scan routes untuk JSDoc annotations
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
