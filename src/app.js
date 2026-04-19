require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initMinio } = require('./config/minio');
const routes = require('./routes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

// Menyajikan file statis (Frontend) dari folder public
app.use(express.static('public'));

const path = require('path');

app.use('/api/v1', routes);

// SPA Fallback untuk React Router
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../public', 'index.html'));
});

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
    initMinio().then(() => {
        app.listen(process.env.PORT, () => console.log(`API on port ${process.env.PORT}`));
    });
}
module.exports = app;