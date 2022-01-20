const { v4: uuidv4 } = require('uuid');
const { BlobServiceClient } = require('@azure/storage-blob');
const { query } = require('../solr/solr');
const config = require('../config/config');

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

        // Get an append blob client
        const appendBlobClient = containerClient.getAppendBlobClient(blobName);

        const { numFound } = solrResponseMeta;
        let start = 0;
        await appendBlobClient.create();

        switch (body.format) {
            case 'JSON':
                // start JSON array
                await appendBlobClient.appendBlock('[', 1);
                break;

            default:
                break;
        }

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

            let uploadStr;
            let resSize;
            let uploadBuf;
            switch (body.format) {
                case 'JSON':
                    uploadStr = JSON.stringify(formattedResponse);
                    // remove '[' ']' for appending
                    uploadStr = uploadStr.slice(1, uploadStr.length - 1);
                    // add , on end for appending
                    if (start + config.SOLR_MAX_ROWS < numFound) {
                        uploadStr += ',';
                    }
                    uploadBuf = Buffer.from(uploadStr);
                    resSize = Buffer.byteLength(uploadBuf);
                    context.log(`Byte Size: ${resSize.toFixed(0)} / ${config.APPEND_MAX_LIMIT}`);
                    context.log(`Chunk Size: ${Number(resSize / (1024 * 1024)).toFixed(4)} MiB`);
                    break;
                default:
                    break;
            }
            if (resSize > config.APPEND_MAX_LIMIT) {
                context.log(`Chunk larger than max append, breaking up`);
                let byteStart = 0;
                do {
                    const byteEnd =
                        byteStart + config.APPEND_MAX_LIMIT < resSize
                            ? byteStart + config.APPEND_MAX_LIMIT
                            : resSize;
                    context.log(`Uploading chunk: ${byteStart}-${byteEnd} of ${resSize}`);
                    const uploadSlice = uploadBuf.slice(byteStart, byteEnd);
                    // eslint-disable-next-line no-await-in-loop
                    const uploadBlobResponse = await appendBlobClient.appendBlock(
                        uploadSlice,
                        Buffer.byteLength(uploadSlice)
                    );
                    context.log(
                        `Blob was uploaded successfully. requestId: ${uploadBlobResponse.requestId}`
                    );
                    byteStart += config.APPEND_MAX_LIMIT + 1;
                } while (byteStart < resSize);
            } else {
                // eslint-disable-next-line no-await-in-loop
                const uploadBlobResponse = await appendBlobClient.appendBlock(
                    uploadStr,
                    uploadStr.length
                );
                context.log(
                    `Blob was uploaded successfully. requestId: ${uploadBlobResponse.requestId}`
                );
            }

            start += config.SOLR_MAX_ROWS;
        } while (start < numFound);

        switch (body.format) {
            case 'JSON':
                // close JSON array
                await appendBlobClient.appendBlock(']', 1);
                break;

            default:
                break;
        }

        context.res = {
            headers: { 'Content-Type': 'application/json' },
            body: {
                req: body,
                solrResponseMeta,
                url: appendBlobClient.url,
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
