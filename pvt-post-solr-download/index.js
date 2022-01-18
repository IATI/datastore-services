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

        context.res = {
            headers: { 'Content-Type': 'application/json' },
            body,
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
