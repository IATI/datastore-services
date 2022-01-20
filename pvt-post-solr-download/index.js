const { v4: uuidv4 } = require('uuid');
const { BlobServiceClient } = require('@azure/storage-blob');
const { PassThrough } = require('stream');
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

        const { numFound } = solrResponseMeta;
        const uploadOptions = { bufferSize: 4 * config.ONE_MEGABYTE, maxBuffers: 20 };
        let uploadResponse;

        if (body.format === 'XML') {
            let start = 0;
            const date = new Date();
            const header = `<?xml version="1.0" encoding="UTF-8"?>\n<iati-activities version="2.03" generated-datetime="${date.toISOString()}">\n`;
            const footer = '</iati-activities>';

            const uploadStream = new PassThrough();

            uploadStream.write(header);

            do {
                context.log(
                    `Downloading ${start}-${
                        start + config.SOLR_MAX_ROWS < numFound
                            ? start + config.SOLR_MAX_ROWS
                            : numFound
                    } rows of total: ${numFound}`
                );
                // eslint-disable-next-line no-await-in-loop
                const formattedResponse = await query(
                    `${body.query}&start=${start}&rows=${config.SOLR_MAX_ROWS}`,
                    body.format,
                    true
                );

                formattedResponse.forEach((doc) => {
                    uploadStream.write(doc.iati_xml);
                });

                start += config.SOLR_MAX_ROWS;
            } while (start < numFound);

            uploadStream.write(footer);
            uploadStream.end();

            uploadResponse = await blockBlobClient.uploadStream(
                uploadStream,
                uploadOptions.bufferSize,
                uploadOptions.maxBuffers,
                { blobHTTPHeaders: { blobContentType: contentTypeMap[body.format] } }
            );
        } else {
            const fullResponse = await queryStream(`${body.query}&rows=${numFound}`, body.format);

            uploadResponse = await blockBlobClient.uploadStream(
                fullResponse,
                uploadOptions.bufferSize,
                uploadOptions.maxBuffers,
                { blobHTTPHeaders: { blobContentType: contentTypeMap[body.format] } }
            );
        }

        context.log(`Blob upload complete requestId: ${uploadResponse.requestId}`);

        context.res = {
            headers: { 'Content-Type': 'application/json' },
            body: {
                req: body,
                solrResponseMeta,
                fileName: blobName,
                url: blockBlobClient.url,
                blobRequestId: uploadResponse.requestId,
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
