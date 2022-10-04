class HTTPResponseError extends Error {
    constructor(response, ...args) {
        super(`HTTP Error Response: ${response.status} ${response.statusText}`, ...args);
        this.response = response;
        this.code = 'HTTP_ERROR';
    }
}

const checkRespStatus = (response) => {
    if (response.ok) {
        // response.status >= 200 && response.status < 300
        return response;
    }
    throw new HTTPResponseError(response);
};

export default checkRespStatus;
