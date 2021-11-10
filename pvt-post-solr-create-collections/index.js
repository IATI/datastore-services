const { createCollection, createOrUpdateAlias } = require('../solr/solr');

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

        // required keys
        ['newVersion', 'collections'].forEach((key) => {
            if (!(key in body)) {
                context.res = {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                    body: { error: `Body must contain a key "${key}"` },
                };
            }
        });

        // collections must be an array
        if (toString.call(body.collections) !== '[object Array]') {
            context.res = {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
                body: { error: '"collections" must be an Array of collection objects' },
            };

            return;
        }

        // create collections
        await Promise.all(
            body.collections.map(async (collection) => {
                await createCollection(`${collection.name}_${body.newVersion}`, collection.config);
            })
        );

        // create aliases
        await Promise.all(
            body.collections.map(async ({ name, alias }) => {
                await createOrUpdateAlias(alias, `${name}_${body.newVersion}`);
            })
        );

        context.res = {
            status: 204,
        };

        return;
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
};
