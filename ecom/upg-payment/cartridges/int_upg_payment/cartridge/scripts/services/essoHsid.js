'use strict';

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Logger = require('dw/system/Logger');
var logger = Logger.getLogger('EssoError', 'Esso');
/**
 * UPG Find Service API call
 * @return {Object} return the result
 */
function getService() {
    return LocalServiceRegistry.createService('esso.query.member', {
        createRequest: function (svc, args) {
            return args;
        },
        parseResponse: function (svc, client) {
            return client;
        },
        filterLogMessage: function (msg) {
            return msg.replace('headers', 'Esso query member Service API Call');
        }
    });
}

/**
 * Esso query member Service API call
 * @return {Object} return the result
 */
function queryMember(userID, requestType) {
    var result;
    try {
        var AuthToken = require('*/cartridge/scripts/services/StargateAuthService');
        var StringUtils = require('dw/util/StringUtils');
        var service = getService();
        service.setRequestMethod('GET');
        service.addHeader('Content-Type', 'application/json');
        var authToken = new AuthToken();
        var token = authToken.getValidToken(requestType);
        service.addHeader('Authorization', 'Bearer ' + token.access_token);
        service.setURL(StringUtils.format(service.getURL(), userID));
        result = service.call();
        return result;
    } catch (e) {
        logger.error('Error while Esso query member service call ' + e);
        return result;
    }
}

exports.queryMember = queryMember;
