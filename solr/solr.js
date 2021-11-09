const fetch = require('node-fetch');
const config = require('../config/config');
const { checkRespStatus } = require('../utils/utils');

// config.SOLR_URL https://default-iati-prod-solrcloud.solr.iatistandard.org/solr/

const makeQueryParamStr = (paramObject) => Object.keys(paramObject).reduce((acc, key) => `${acc  }&${key}=${paramObject[key]}`, '');

module.exports = {
    createCollection: async (name, colConfig) => {
        const queryParamString = makeQueryParamStr(colConfig);
        const response = await fetch(
            `${config.SOLRCONFIG.url}admin/collections?action=CREATE&name=${name}${queryParamString}`
        );
        checkRespStatus(response);
        
    },

    createOrUpdateAlias: async (aliasName, collectionName) => {
        const response = await fetch(
            `${config.SOLRCONFIG.url}admin/collections?action=CREATEALIAS&name=${aliasName}&collections=${collectionName}`
        );
        checkRespStatus(response);
        
    },
};
