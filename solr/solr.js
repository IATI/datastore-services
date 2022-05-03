const fetch = require('node-fetch');
const config = require('../config/config');
const { checkRespStatus, prependBOM, BOM } = require('../utils/utils');

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

    query: async (url, format = 'JSON', docsOnly = false, stream = false) => {
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
            case 'XLSX':
                url.searchParams.set('wt', 'xlsx');
                break;
            case 'XL-CSV':
                url.searchParams.set('wt', 'csv');
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

        if (stream) {
            if (format === 'XL-CSV') {
                return response.body.pipe(prependBOM);
            }
            return response.body;
        }
        let body;

        if (['CSV', 'XLSX'].includes(format)) {
            body = await response.text();
        } else if (format === 'XL-CSV') {
            body = await response.text();
            body = BOM + body;
        } else {
            body = await response.json();
            if (docsOnly) {
                body = body.response.docs;
            }
        }

        return body;
    },
};
