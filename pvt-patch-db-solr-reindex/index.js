const db = require('../database/db');

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

        // key ids must be in body
        if (!('ids' in body)) {
            context.res = {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
                body: { error: 'Body must contain a key "ids"' },
            };

            return;
        }

        // ids must be an array
        if (toString.call(body.ids) !== '[object Array]') {
            context.res = {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
                body: { error: '"ids" must be an Array of document ids' },
            };

            return;
        }

        await db.reIndexSolrForIds(body.ids);

        context.res = {
            status: 204,
        };

        return;
    } catch (e) {
        context.log(e);
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(e.message),
        };
    }
};
