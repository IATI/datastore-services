const { client, getStartTime, getElapsedTime } = require('../config/appInsights');
const { aSetex, aGet } = require('../config/redis');
const config = require('../config/config');

module.exports = async (context, req) => {
    // context.log is equivalent to console.log in Azure Functions
    context.log('JavaScript HTTP trigger function processed a request.');

    const startTime = getStartTime();

    const name = req.query.name || (req.body && req.body.name);
    const responseMessage = `Private API.\nVersion ${config.VERSION}\n${
        name
            ? `Hello, ${name}. This HTTP triggered function executed successfully.`
            : 'This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.'
    }`;

    const responseTime = getElapsedTime(startTime);

    // Send a specific metric in AppInsights Telemetry
    client.trackMetric({
        name: 'Message Creation - Success (s)',
        value: responseTime,
    });

    // Send a full Event in AppInsights - able to report/chart on this in AppInsights
    const eventSummary = {
        name: 'PVT Event Summary',
        properties: {
            messageTime: responseTime,
            responseMessage,
            query: name,
        },
    };
    client.trackEvent(eventSummary);

    // Cache a value with a expiration time in Redis (use aSet() for no expiration)
    await aSetex('key', 60, 'value');

    // Get value back from Redis
    context.log(`Value from Redis: ${await aGet('key')}`);

    // Generating a response
    context.res = {
        status: 200 /* Defaults to 200 */,
        headers: { 'Content-Type': 'application/json' },
        body: responseMessage,
    };
};
