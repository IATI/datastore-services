# datastore-services

## Prerequisities

-   nvm - [nvm](https://github.com/nvm-sh/nvm) - Node version manager
-   Node LTS
    -   This will be the latest LTS version supported by Azure Functions, set in `.nvmrc`
    -   once you've installed nvm run `nvm use` which will look at `.nvmrc` for the node version, if it's not installed then it will prompt you to install it with `nvm install <version> --latest-npm`
-   npm >=8
    -   nvm will install the version of npm packaged with node. make sure to use the `--latest-npm` flag to get the latest version
    -   If you forgot to do that install the latest version of npm with `npm i -g npm`
-   [Azure Functions Core Tools v3](https://github.com/Azure/azure-functions-core-tools)
-   [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) version 2.4 or later.

## Getting Started

1. Clone repo
1. Follow instructions for nvm/node prerequisties above
1. Prepare your environment variables as described below
1. Run `npm i`
1. Run `npm start` to run the function locally using the Azure Functions Core Tools

## Environment Variables

### Azure Durable Functions

Needs a `local.settings.json` with an [Azure Storage account](https://github.com/IATI/IATI-Internal-Wiki/blob/main/IATI-Unified-Infra/blobs.md) connection string to work locally. Use an account you've created yourself for this local testing.

```json
{
    "IsEncrypted": false,
    "Values": {
        "FUNCTIONS_WORKER_RUNTIME": "node",
        "AzureWebJobsStorage": "<connection string>"
    }
}
```

### Set Up

`cp .env.example .env`

### Description

`APPINSIGHTS_INSTRUMENTATIONKEY`

-   Needs to be set for running locally, but will not actually report telemetry to the AppInsights instance in my experience

Others:

```
PGDATABASE=<dbname>
PGHOST=<host>
PGPASSWORD=
PGPORT=5432
PGSSL=true
PGUSER=<username>@<host>

SOLR_URL=
SOLR_USERNAME=
SOLR_PASSWORD=
```

The DOWNLOAD_CONTAINER_NAME must be a container with Public Access for Blobs to allow unauthenticated download from the browser.

```
STORAGE_CONNECTION_STRING=
DOWNLOAD_CONTAINER_NAME=
```

### Adding New

Add in:

1. .env.example
1. .env
1. `/config/config.js`

Import

```
const config = require("./config");

let myEnvVariable = config.ENV_VAR
```

## Attached Debugging (VSCode)

-   Set a breakpoint
-   Press F5 to start the Azure Function and Attach the VSCode debugger
    -   Configuration is contained in `.vscode/launch.json` and `.vscode/tasks.json`
-   Trigger a request that will hit your break point
-   Enojy!

## Linting and Code Formatting

### Prerequisities

-   To show linting inline install [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) for VSCode

### Info

-   This is done with eslint following the airbnb-base style and using [Prettier](https://prettier.io). Implemented with [this](https://sourcelevel.io/blog/how-to-setup-eslint-and-prettier-on-node) guide.
-   If you use VSCode the formatting will happen automagically on save due to the `.vscode/settings.json` > `"editor.formatOnSave": true` setting

## Endpoints /api

### `GET /pub/version`

-   Returns application version from `package.json`

```
<0.0.0>
```

### `PATCH pvt/db/solr-reindex`

-   Request

```json
{ "ids": ["74790f8d-29f7-4bda-afa9-b46070dfc276", "547d7d97-9330-4938-bc4b-f64c3844be23"] }
```

-   Returns

204 Response

### `PATCH /pvt/db/solr-reindex/all`

-   Returns

204 Response

### `PATCH /pvt/db/clear-flattener`

-   Request

```json
{ "ids": ["74790f8d-29f7-4bda-afa9-b46070dfc276", "547d7d97-9330-4938-bc4b-f64c3844be23"] }
```

-   Returns

204 Response

### `PATCH /pvt/db/clear-flattener/all`

-   Returns

204 Response

### `POST /pvt/solr/create-collections`

Creates new collections named `collection.name_newVersion`, aliases to `collection.alias`

-   Request

```json
{
  "newVersion": "4",
  "collections": [
    {
      "name": "activity",
      "config": {
        "collection.configName": "activity_configset_4",
        "numShards": 1,
        "replicationFactor": 1
      },
      "alias": "activity_solrize"
    },
    {
      "name": "budget",
      "config": {
        "collection.configName": "budget_configset_4",
        "numShards": 1,
        "replicationFactor": 1
      },
      "alias": "budget_solrize"
    }
    ...
  ]
}
```

Also see [exampleRequest.json](./pvt-post-solr-create-collections/exampleRequest.json)

-   Returns

204 Response

### `POST /pvt/orchestrators/DownloadOrchestrator`

Downloads the provided Solr query to Azure Blobs and returns URL where it can be downloaded from.

-   Request

-   query - solr query
-   format - JSON, CSV, or XML

Example:

```json
{
    "query": "activity/select?q=reporting_org_ref:\"GB-CHC\" AND recipient_country_code:PK&fl=reporting_org_ref,iati_identifier",
    "format": "CSV"
}
```

-   Returns

200 Response

Example

```json:
{
    "req": {
        "query": "activity/select?q=reporting_org_ref:\"GB-CHC\" AND recipient_country_code:PK&fl=reporting_org_ref,iati_identifier",
        "format": "CSV"
    },
    "solrResponseMeta": {
        "numFound": 206,
        "start": 0,
        "numFoundExact": true,
        "docs": []
    },
    "fileName": "a1410f0b-6f42-4680-8421-d2b5313d3f02.csv",
    "url": "https://name.blob.core.windows.net/dss-downloads/a1410f0b-6f42-4680-8421-d2b5313d3f02.csv",
    "blobRequestId": "d953a662-f01e-0001-6511-0ec25c000000"
}
```

## Creating a new route

`func new --name <routename> --template "HTTP trigger" --authlevel "Function"`

## Integration Tests

### Running

-   Install newman globally `npm i -g newman`
-   Start function `npm start`
-   Run Tests `npm run int:test`

### Modifying/Adding

Integration tests are written in Postman v2.1 format and run with newman
Import the `integrations-tests/azure-function-node-microservice-template.postman_collection.json` into Postman and write additional tests there

## Deployment

Follows the [IATI Development Process](https://github.com/IATI/IATI-Internal-Wiki#development-process)
