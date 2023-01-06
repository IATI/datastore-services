import { v4 as uuidv4 } from 'uuid';
import { BlobServiceClient } from '@azure/storage-blob';
import { PassThrough } from 'stream';
import { query } from '../solr/solr.js';
import config from '../config/config.js';

const contentTypeMap = {
    JSON: 'application/json',
    CSV: 'text/plain',
    XML: 'application/xml',
    EXCEL: 'text/plain',
};

export default async function download(context) {
    try {
        context.log('Starting Download Function');
        const body = context.bindings.Download;

        // No body
        if (!body || JSON.stringify(body) === '{}') {
            return {
                status: 400,
                error: 'No body',
            };
        }

        // key query must be in body
        if (!('query' in body)) {
            return {
                status: 400,
                error: 'Body must contain a key "query"',
            };
        }
        // key format must be in body
        if (!('format' in body)) {
            return {
                status: 400,
                error: 'Body must contain a key "format"',
            };
        }

        // format must be 'XML', 'JSON', 'CSV', 'EXCEL'
        const formats = ['XML', 'JSON', 'CSV', 'EXCEL'];
        if (!formats.includes(body.format)) {
            return {
                status: 400,
                error: `format must be one of the following values ${formats.join()}`,
            };
        }

        const metaURL = new URL(config.SOLRCONFIG.url + body.query);
        metaURL.searchParams.set('rows', 0);
        // query solr to get response info (not results yet)
        const { response: solrResponseMeta } = await query(metaURL);

        // upload to blob
        const blobServiceClient = BlobServiceClient.fromConnectionString(
            config.STORAGE_CONNECTION_STRING
        );
        // set service version so Content-Disposition is returned by Blob API when retrieving
        await blobServiceClient.setProperties({ defaultServiceVersion: '2020-12-06' });
        const containerClient = blobServiceClient.getContainerClient(
            config.DOWNLOAD_CONTAINER_NAME
        );
        let blobName;
        if (body.format === 'EXCEL') {
            blobName = `${uuidv4()}.csv`;
        } else {
            blobName = `${uuidv4()}.${body.format.toLowerCase()}`;
        }

        // Get an block blob client
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        const { numFound } = solrResponseMeta;
        const uploadOptions = {
            bufferSize: 4 * config.ONE_MEGABYTE,
            maxBuffers: 20,
        };
        const uploadConfig = {
            blobHTTPHeaders: {
                blobContentType: contentTypeMap[body.format],
                blobContentDisposition: `attachment; filename=${blobName}`,
            },
        };
        let uploadResponse;
        const queryUrl = new URL(config.SOLRCONFIG.url + body.query);

        // add sort if not present
        if (!queryUrl.searchParams.has('sort')) {
            queryUrl.searchParams.set('sort', 'id desc');
        }

        if (body.format === 'XML') {
            // XML - have to wrap in <iati-activities> and paginate to download raw iati xml from solr
            const date = new Date();
            const header = `<?xml version="1.0" encoding="UTF-8"?>\n<iati-activities version="2.03" generated-datetime="${date.toISOString()}">\n`;
            const footer = '</iati-activities>';

            const uploadStream = new PassThrough();

            uploadStream.write(header);

            queryUrl.searchParams.set('rows', config.SOLR_MAX_ROWS);
            // only fetch iati_xml field with raw XML
            queryUrl.searchParams.set('fl', 'iati_xml');

            const uploadResponsePromise = blockBlobClient.uploadStream(
                uploadStream,
                uploadOptions.bufferSize,
                uploadOptions.maxBuffers,
                uploadConfig
            );

            // paginate over results using cursorMark
            let currentCursorMark = '*';
            let done = false;
            do {
                queryUrl.searchParams.set('cursorMark', currentCursorMark);

                // eslint-disable-next-line no-await-in-loop
                const formattedResponse = await query(queryUrl, body.format, false);
                formattedResponse.response.docs.forEach((doc) => {
                    uploadStream.write(doc.iati_xml);
                });

                const { nextCursorMark } = formattedResponse;
                if (nextCursorMark === currentCursorMark) {
                    done = true;
                } else {
                    currentCursorMark = nextCursorMark;
                }
            } while (!done);

            uploadStream.write(footer);
            uploadStream.end();

            uploadResponse = await uploadResponsePromise;
        } else {
            // JSON, CSV, EXCEL - request all rows and stream directly to blob
            queryUrl.searchParams.set('rows', numFound);
            queryUrl.searchParams.set('omitHeader', true);
            const fullResponse = await query(queryUrl, body.format, false, true);
            context.log('Streaming query from Solr to Blob');
            uploadResponse = await blockBlobClient.uploadStream(
                fullResponse,
                uploadOptions.bufferSize,
                uploadOptions.maxBuffers,
                uploadConfig
            );
        }

        context.log(`Blob upload complete. requestId: ${uploadResponse.requestId}`);

        return {
            status: 200,
            req: body,
            solrResponseMeta,
            fileName: blobName,
            url: blockBlobClient.url,
            blobRequestId: uploadResponse.requestId,
        };
    } catch (error) {
        context.log(error);
        return {
            status: 500,
            body: error.message,
        };
    }
}
