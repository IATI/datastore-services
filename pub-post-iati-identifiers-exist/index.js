import config from '../config/config.js';
import { query } from '../solr/solr.js';

async function testIatiIdentifiers(queryUrl, identifiers) {
    const iatiIdentifiersQuery = identifiers.map(identifier => 
                                                    `iati_identifier_exact:${JSON.stringify(identifier)}`).join(" ")

    const requestBody = {
        query: iatiIdentifiersQuery,
        params: {rows: 0},
        facet: {
            "identifiers" : {
                    type: "terms",
                    field : "iati_identifier",
                    offset: 0,
                    limit: 1000
                }
            }
        };

    const solrJsonResponse = await query(queryUrl, 'JSON', false, false, 
                                         "application/json",
                                         JSON.stringify(requestBody));

    const result = {};

    if ('identifiers' in solrJsonResponse.facets) {
        solrJsonResponse.facets.identifiers.buckets.forEach(facetItem => {
            result[facetItem.val] = facetItem.count;
        });
    }

    return result;
}

export default async function pubIatiIdentifiersExist(context, req) {
    try {
        const { body } = req;
        const queryUrl = new URL(`${config.SOLRCONFIG.url}solr/activity/select`);
        const BATCH_SIZE = config.SOLR_MAX_ROWS;
        const MAX_IDS_TO_TEST = config.IATI_IDENTIFIERS_EXIST_MAX_NUMBER_OF_IDS;

        // No body, or body not valid JSON
        if (!body || JSON.stringify(body) === '{}' || typeof(body) === 'string') {
            context.res = {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
                body: { error: 'No JSON body' },
            };

            return;
        }

        // required keys
        ['iati_identifiers'].forEach((key) => {
            if (!(key in body)) {
                context.res = {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                    body: { error: `Body must contain key "${key}"` },
                };
            }
        });
        if (context.res.status === 400) {
            return;
        }        

        // iatiIdentifiers must be an array
        if (toString.call(body.iati_identifiers) !== '[object Array]') {
            context.res = {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
                body: { 
                    error: '"iati_identifiers" must be an Array of strings (each one an IATI Identifier) ' 
                         + `but it is of type: ${toString.call(body.iati_identifiers)}`,
                },
            };
            return;
        }

        const responseBody = {
            "message": "OK",
            "detail": "",
            "unique_iati_identifiers": 0,
            "total_iati_identifier_occurrences": 0,
            "iati_identifiers_found": {}
        };

        // only make the request to Solr if API consumer has given a non-empty list
        if (body.iati_identifiers.length > 0) {
            let uniqueIdentifiers = [...new Set(body.iati_identifiers)];
            if (uniqueIdentifiers.length > MAX_IDS_TO_TEST) {
                responseBody.message = "Warning";
                responseBody.detail = `More than ${MAX_IDS_TO_TEST} IATI Identifiers were passed. Testing the first ${MAX_IDS_TO_TEST}.`;
                uniqueIdentifiers = uniqueIdentifiers.slice(0, MAX_IDS_TO_TEST);
            }
            
            const numBatches = Math.floor(uniqueIdentifiers.length / BATCH_SIZE) + 1;
            for (let batch = 0; batch <= numBatches; batch += 1) {
                // eslint-disable-next-line no-await-in-loop
                Object.assign(responseBody.iati_identifiers_found, await testIatiIdentifiers(queryUrl, uniqueIdentifiers.slice(batch * BATCH_SIZE, batch * BATCH_SIZE + BATCH_SIZE)));
            }
            responseBody.unique_iati_identifiers = Object.keys(responseBody.iati_identifiers_found).length;
            responseBody.total_iati_identifier_occurrences = Object.values(responseBody.iati_identifiers_found).reduce((acc, val) => acc + val, 0);
        }

        context.res = {
            status: 200,
            body: responseBody
        };
        
    } catch (e) {
        context.log(e);
        const body = {};
        body.message = e.message;
        if (e.code === 'HTTP_ERROR') {
            body.requestUrl = e.response.url;
            const contentType = await e.response.headers.get('content-type');
            if (contentType.includes('text/html')) {
                body.response = await e.response.text();
            }
            if (contentType.includes('application/json')) {
                body.response = await e.response.json();
            }
        }
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body,
        };
    }
}
