const { v4: uuidv4 } = require('uuid');
const { BlobServiceClient } = require('@azure/storage-blob');
const { query, queryStream } = require('../solr/solr');
const config = require('../config/config');

const contentTypeMap = {
    JSON: 'application/json',
    CSV: 'text/plain',
    XML: 'application/xml',
};

module.exports = async (context, req) => {
    try {
        const { body } = req;

        // No body
        if (!body || JSON.stringify(body) === '{}') {
            context.res = {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
                body: { error: 'No body' },
            };

            return;
        }

        // key query must be in body
        if (!('query' in body)) {
            context.res = {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
                body: { error: 'Body must contain a key "query"' },
            };

            return;
        }
        // key format must be in body
        if (!('format' in body)) {
            context.res = {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
                body: { error: 'Body must contain a key "format"' },
            };

            return;
        }

        // format must be 'XML', 'JSON', 'CSV'
        const formats = ['XML', 'JSON', 'CSV'];
        if (!formats.includes(body.format)) {
            context.res = {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
                body: { error: `format must be one of the following values ${formats.join()}` },
            };

            return;
        }

        // query solr to get response info (not results yet)
        const { response: solrResponseMeta } = await query(`${body.query}&rows=0`);

        // upload to blob
        const blobServiceClient = BlobServiceClient.fromConnectionString(
            config.STORAGE_CONNECTION_STRING
        );
        const containerClient = blobServiceClient.getContainerClient(
            config.DOWNLOAD_CONTAINER_NAME
        );
        const blobName = `${uuidv4()}.${body.format.toLowerCase()}`;

        // Get an block blob client
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        const ONE_MEGABYTE = 1024 * 1024;
        const uploadOptions = { bufferSize: 4 * ONE_MEGABYTE, maxBuffers: 20 };

        const { numFound } = solrResponseMeta;

        const fullResponse = await queryStream(`${body.query}&rows=${numFound}`, body.format);

        await blockBlobClient.uploadStream(
            fullResponse,
            uploadOptions.bufferSize,
            uploadOptions.maxBuffers,
            { blobHTTPHeaders: { blobContentType: contentTypeMap[body.format] } }
        );

        context.res = {
            headers: { 'Content-Type': 'application/json' },
            body: {
                req: body,
                solrResponseMeta,
                url: blockBlobClient.url,
            },
        };
    } catch (error) {
        context.log(error);
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: error.message,
        };
    }
};
