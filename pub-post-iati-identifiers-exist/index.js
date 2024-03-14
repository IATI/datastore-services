import config from '../config/config.js';
import { query } from '../solr/solr.js';

async function testIatiIdentifiers(queryUrl, identifiers, maxRecords) {
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
                    limit: maxRecords
                }
            }
        };

    const solrJsonResponse = await query(queryUrl, 'JSON', false, false, 
                                         "application/json",
                                         JSON.stringify(requestBody));

    const result = {};

    if ('identifiers' in solrJsonResponse.facets) {
        solrJsonResponse.facets.identifiers.buckets.forEach(facetItem => {
            result[facetItem.val] = {"count": facetItem.count};
        });
    }

    return result;
}

function getJsonErrorResponse(statusCode, errorMessage) {
    return {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: { error: errorMessage },
    };
}

export default async function pubIatiIdentifiersExist(context, req) {
    try {
        const { body } = req;
        const queryUrl = new URL(`${config.SOLRCONFIG.url}activity/select`);
        const BATCH_SIZE = config.SOLR_MAX_ROWS;
        const MAX_IDS_TO_TEST = config.IATI_IDENTIFIERS_EXIST_MAX_NUMBER_OF_IDS;

        // No body, or body not valid JSON
        if (!body || JSON.stringify(body) === '{}' || typeof(body) === 'string') {
            context.res = getJsonErrorResponse(400, 'No JSON body');
            return;
        }

        // required keys
        ['iati_identifiers'].forEach((key) => {
            if (!(key in body)) {
                context.res = getJsonErrorResponse(400, `Body must contain key "${key}"`);
            }
        });
        if (context.res.status === 400) {
            return;
        }         

        // iatiIdentifiers must be an array
        if (toString.call(body.iati_identifiers) !== '[object Array]') {
            context.res = getJsonErrorResponse(400, 
                                               '"iati_identifiers" must be an Array of strings (each one an IATI Identifier) ' 
                                               + `but it is of type: ${toString.call(body.iati_identifiers)}`);
            return;
        }

        const responseBody = {
            "message": "OK",
            "detail": "",
            "unique_iati_identifiers_found": 0,
            "total_iati_identifier_occurrences": 0,
            "num_iati_identifiers_not_found": 0,
            "iati_identifiers_found": {},
            "iati_identifiers_not_found": {}
        };

        // only make the request to Solr if API consumer has given a non-empty list
        if (body.iati_identifiers.length > 0) {
            const uniqueIdentifiers = [...new Set(body.iati_identifiers)];
            if (uniqueIdentifiers.length > MAX_IDS_TO_TEST) {
                context.res = getJsonErrorResponse(400, 
                    `More than ${MAX_IDS_TO_TEST} IATI Identifiers were passed. ` +
                    `${MAX_IDS_TO_TEST} is the maximum number that can be tested in a single API call.`);
                return;
            }
            
            const numBatches = Math.floor(uniqueIdentifiers.length / BATCH_SIZE) + 1;
            for (let batchNum = 0; batchNum <= numBatches; batchNum += 1) {
                const currentBatch = uniqueIdentifiers.slice(batchNum * BATCH_SIZE, batchNum * BATCH_SIZE + BATCH_SIZE);
                // eslint-disable-next-line no-await-in-loop
                const identifiersFound = await testIatiIdentifiers(queryUrl, currentBatch, BATCH_SIZE);
                const identifiersNotFound = Object.fromEntries(currentBatch.filter(x => !(x in identifiersFound)).map(v => [v, {}]));
                Object.assign(responseBody.iati_identifiers_found, identifiersFound);
                Object.assign(responseBody.iati_identifiers_not_found, identifiersNotFound);
            }
            responseBody.unique_iati_identifiers_found = Object.keys(responseBody.iati_identifiers_found).length;
            responseBody.total_iati_identifier_occurrences = Object.values(responseBody.iati_identifiers_found).reduce((acc, val) => acc + val.count, 0);
            responseBody.num_iati_identifiers_not_found = Object.keys(responseBody.iati_identifiers_not_found).length;
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
