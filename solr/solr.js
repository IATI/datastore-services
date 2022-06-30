const fetch = require('node-fetch');
const config = require('../config/config');
const { checkRespStatus } = require('../utils/utils');
const { prependBOM, BOM } = require('../utils/bom');
const { ExcelSafeStreamTransform, excelSafeStringTransform } = require('../utils/excel');

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
            case 'EXCEL':
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
            if (format === 'EXCEL') {
                const excelTransformStream = new ExcelSafeStreamTransform();
                return prependBOM(response.body.pipe(excelTransformStream));
            }
            return response.body;
        }
        let body;

        if (format === 'CSV') {
            body = await response.text();
        } else if (format === 'EXCEL') {
            body = await response.text();
            body = BOM + excelSafeStringTransform(body);
        } else {
            body = await response.json();
            if (docsOnly) {
                body = body.response.docs;
            }
        }

        return body;
    },

    deleteDoc: async (docId, collection) => {
        const url = `${config.SOLRCONFIG.url}${collection}/update`;
        const body = { delete: { query: `iati_activities_document_id:${docId}` } };

        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${Buffer.from(
                    `${config.SOLRCONFIG.user}:${config.SOLRCONFIG.password}`,
                    'binary'
                ).toString('base64')}`,
            },
        });
        checkRespStatus(response);
    },
};
