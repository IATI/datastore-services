require('dotenv').config();
const { version } = require('../package.json');

module.exports = {
    APP_NAME: 'Datastore services',
    VERSION: version,
    NODE_ENV: process.env.NODE_ENV,
    APPINSIGHTS_INSTRUMENTATIONKEY: process.env.APPINSIGHTS_INSTRUMENTATIONKEY,
    NS_PER_SEC: 1e9,
    PGCONFIG: {
        host: process.env.PGHOST,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        port: process.env.PGPORT,
        ssl: process.env.PGSSL,
    },
    SOLRCONFIG: {
        url: process.env.SOLR_URL,
        user: process.env.SOLR_USERNAME,
        password: process.env.SOLR_PASSWORD,
    },
};
