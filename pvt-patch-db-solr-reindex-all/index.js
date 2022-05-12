const db = require('../database/db');

module.exports = async (context) => {
    try {
        await db.reIndexSolrAll();

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
