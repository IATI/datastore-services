import 'dotenv/config';
import { readFile } from 'fs/promises';

const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));

const config = {
    APP_NAME: 'Datastore services',
    VERSION: version,
    NODE_ENV: process.env.NODE_ENV,
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
    STORAGE_CONNECTION_STRING: process.env.STORAGE_CONNECTION_STRING,
    DOWNLOAD_CONTAINER_NAME: process.env.DOWNLOAD_CONTAINER_NAME,
    APPEND_MAX_LIMIT: 4194304,
    SOLR_MAX_ROWS: 1000,
    ONE_MEGABYTE: 1024 * 1024,
    IATI_IDENTIFIERS_EXIST_MAX_NUMBER_OF_IDS: process.env.IATI_IDENTIFIERS_EXIST_MAX_NUMBER_OF_IDS
};

export default config;
