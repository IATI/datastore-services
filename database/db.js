const { Pool } = require('pg');
const config = require('../config/config');

module.exports = {
    query: async (sql, values = null) => {
        const pool = new Pool(config.PGCONFIG);
        const result = await pool.query(sql, values);
        await pool.end();

        return result.rows;
    },

    getFirstRow: async (sql, values = null) => {
        const pool = new Pool(config.PGCONFIG);
        const result = await pool.query(sql, values);
        await pool.end();

        if (result.rows.length > 0) {
            return result.rows[0];
        }
        return null;
    },

    clearSolrForIds: async (ids) => {
        const sql = `
        UPDATE document
        SET 
            solrize_start = Null,
            solrize_end = Null,
            solr_api_error = Null
        WHERE
            id = ANY($1);
        `;

        const result = await module.exports.query(sql, [ids]);

        return result;
    },
};
