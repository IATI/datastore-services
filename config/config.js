require('dotenv').config();
const { version } = require('../package.json');

module.exports = {
    APP_NAME: 'IATI App Name Here',
    VERSION: version,
    NODE_ENV: process.env.NODE_ENV,
    APPINSIGHTS_INSTRUMENTATIONKEY: process.env.APPINSIGHTS_INSTRUMENTATIONKEY,
    NS_PER_SEC: 1e9,
};
