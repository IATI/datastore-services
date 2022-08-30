import { reIndexSolrAll } from '../database/db.js';

export default async function pvtPatchDbSolrReindexAll(context) {
    try {
        await reIndexSolrAll();

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
}
