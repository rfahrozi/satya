require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initMinio } = require('./config/minio');
const routes = require('./routes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

const path = require('path');
const BASE_PATH = process.env.BASE_PATH || '/satya';

const baseRouter = express.Router();

// Menyajikan file statis (Frontend) dari folder public
baseRouter.use(express.static('public'));

baseRouter.use('/api/v1', routes);

// SPA Fallback untuk React Router
baseRouter.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../public', 'index.html'));
});

// Mount at explicit BASE_PATH (if Nginx passes the prefix)
app.use(BASE_PATH, baseRouter);

// Mount at root (if Nginx strips the prefix)
app.use('/', baseRouter);

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
    initMinio().then(() => {
        app.listen(process.env.PORT || 3000, () => console.log(`API on port ${process.env.PORT || 3000} with base path ${BASE_PATH}`));
    });
}
module.exports = app;