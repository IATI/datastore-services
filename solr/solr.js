import fetch from 'node-fetch';
import config from '../config/config.js';
import checkRespStatus from '../utils/utils.js';
import { prependBOM, BOM } from '../utils/bom.js';
import { ExcelSafeStreamTransform, excelSafeStringTransform } from '../utils/excel.js';

const makeQueryParamStr = (paramObject) =>
    Object.keys(paramObject).reduce((acc, key) => `${acc}&${key}=${paramObject[key]}`, '');

const createCollection = async (name, colConfig) => {
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
};

const createOrUpdateAlias = async (aliasName, collectionName) => {
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
};

const query = async (url, format = 'JSON', docsOnly = false, stream = false, 
                     contentType = '', requestBody = '') => {
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
            url.searchParams.set('csv.mv.separator', '|');
            break;
        default:
            break;
    }

    const req = {
        method : requestBody === '' ? "GET" : "POST",
        headers: {
            Authorization: `Basic ${Buffer.from(
                `${config.SOLRCONFIG.user}:${config.SOLRCONFIG.password}`,
                'binary'
            ).toString('base64')}`
        },
        body : requestBody
    };
    if (contentType !== "") {
        req.headers["Content-Type"] = contentType;
    }
    const response = await fetch(url, req);
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
};

export { query, createCollection, createOrUpdateAlias };
