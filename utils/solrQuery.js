// This ensures that the caller-supplied query is a read-only handler before it
// is relayed. Parsing (rather than pasting) it into the URL also means every
// parameter is encoded correctly.
//
// Accepted forms: "<collection>/select[?<params>]" or
//   "<collection>/search[?<params>]"

const MAX_QUERY_LENGTH = 8000;
const READ_ONLY_PATH = /^[A-Za-z][A-Za-z0-9_-]*\/(?:select|search)$/;

class SolrQueryError extends Error {}

const parseReadOnlySolrQuery = (raw) => {
    if (typeof raw !== 'string') {
        throw new SolrQueryError('"query" must be a string');
    }

    const query = raw.trim();

    if (query === '') {
        throw new SolrQueryError('"query" must not be empty');
    }
    if (query.length > MAX_QUERY_LENGTH) {
        throw new SolrQueryError(`"query" must be ${MAX_QUERY_LENGTH} characters or fewer`);
    }
    // A fragment is accepted by URL but silently truncates later parameters.
    if (query.includes('#')) {
        throw new SolrQueryError('"query" must not contain a "#" fragment');
    }

    const [rawPath, ...rest] = query.split('?');
    if (rest.length > 1) {
        throw new SolrQueryError('"query" must contain at most one "?"');
    }

    // Normalise stray slashes so "/activity/select/" and "activity/select" match.
    const path = rawPath.replace(/^\/+/, '').replace(/\/+$/, '');

    if (path.startsWith('admin/')) {
        throw new SolrQueryError(
            `"query" must target a read-only select/search handler, but "${path}" is an admin handler`,
        );
    }
    if (!READ_ONLY_PATH.test(path)) {
        throw new SolrQueryError(
            '"query" must be a read-only path in the form "<collection>/select" or "<collection>/search"',
        );
    }

    const params = new URLSearchParams(rest[0] ?? '');
    // `qt` can reroute the request to another (possibly writable) handler, so exclude that
    if (params.has('qt')) {
        throw new SolrQueryError('"query" must not include a "qt" parameter');
    }
    return { path, params };
};

export { parseReadOnlySolrQuery, SolrQueryError };
