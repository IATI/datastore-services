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

    reIndexSolrForIds: async (ids) => {
        const sql = `
        UPDATE document
        SET 
            solrize_reindex = 't'
        WHERE
            id = ANY($1);
        `;

        const result = await module.exports.query(sql, [ids]);

        return result;
    },

    reIndexSolrAll: async () => {
        const pool = new Pool(config.PGCONFIG);
        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            const sql = `
                UPDATE document
                SET
                    solrize_reindex = 't'
                WHERE
                    solrize_end is not Null
                `;
            await client.query(sql);
            await client.query('COMMIT');
            return;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
            await pool.end();
        }
    },

    clearFlattenerForIds: async (ids) => {
        const sql = `
        UPDATE document
        SET 
            flatten_api_error = Null,
            flatten_end = Null,
            flatten_start = Null,
            flattened_activities = Null
        WHERE
            id = ANY($1);
        `;

        const result = await module.exports.query(sql, [ids]);

        return result;
    },

    clearFlattenerForAll: async () => {
        const pool = new Pool(config.PGCONFIG);
        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            const sql = `
                UPDATE document
                SET 
                    flatten_api_error = Null,
                    flatten_end = Null,
                    flatten_start = Null,
                    flattened_activities = Null
                WHERE 
                    flatten_end is not Null and downloaded is not Null
                `;
            await client.query(sql);
            await client.query('COMMIT');
            return;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
            await pool.end();
        }
    },
};
