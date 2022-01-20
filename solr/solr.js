const fetch = require('node-fetch');
const config = require('../config/config');
const { checkRespStatus } = require('../utils/utils');

const makeQueryParamStr = (paramObject) =>
    Object.keys(paramObject).reduce((acc, key) => `${acc}&${key}=${paramObject[key]}`, '');

module.exports = {
    createCollection: async (name, colConfig) => {
        const queryParamString = makeQueryParamStr(colConfig);
        const response = await fetch(
            `${config.SOLRCONFIG.url}admin/collections?action=CREATE&name=${name}${queryParamString}`,
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(
                        `${config.SOLRCONFIG.user}:${config.SOLRCONFIG.password}`,
                        'binary'
                    ).toString('base64')}`,
                },
            }
        );
        checkRespStatus(response);
    },

    createOrUpdateAlias: async (aliasName, collectionName) => {
        const response = await fetch(
            `${config.SOLRCONFIG.url}admin/collections?action=CREATEALIAS&name=${aliasName}&collections=${collectionName}`,
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(
                        `${config.SOLRCONFIG.user}:${config.SOLRCONFIG.password}`,
                        'binary'
                    ).toString('base64')}`,
                },
            }
        );
        checkRespStatus(response);
    },

    query: async (url, format = 'JSON', docsOnly = false) => {
        switch (format) {
            case 'CSV':
                url.searchParams.set('wt', 'csv');
                break;
            case 'JSON':
                url.searchParams.set('wt', 'json');
                break;
            case 'XML':
                url.searchParams.set('fl', 'iati_xml');
                break;
            default:
                break;
        }
        const response = await fetch(url, {
            headers: {
                Authorization: `Basic ${Buffer.from(
                    `${config.SOLRCONFIG.user}:${config.SOLRCONFIG.password}`,
                    'binary'
                ).toString('base64')}`,
            },
        });
        checkRespStatus(response);
        let body;

        if (format === 'CSV') {
            body = await response.text();
        } else {
            body = await response.json();
            if (docsOnly) {
                body = body.response.docs;
            }
        }

        return body;
    },

    queryStream: async (url, format = 'JSON') => {
        switch (format) {
            case 'CSV':
                url.searchParams.set('wt', 'csv');
                break;
            case 'JSON':
                url.searchParams.set('wt', 'json');
                break;
            case 'XML':
                url.searchParams.set('fl', 'iati_xml');
                break;
            default:
                break;
        }
        const response = await fetch(url, {
            headers: {
                Authorization: `Basic ${Buffer.from(
                    `${config.SOLRCONFIG.user}:${config.SOLRCONFIG.password}`,
                    'binary'
                ).toString('base64')}`,
            },
        });
        checkRespStatus(response);

        return response.body;
    },
};
