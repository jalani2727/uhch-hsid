/* eslint-disable no-undef */
/* eslint-disable valid-jsdoc */
'use strict';

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Logger = require('dw/system/Logger');
var AuthToken = require('*/cartridge/scripts/services/EaseAuthService');
/**
 * Create Request benefit calculations in SF Ease
 * @returns {dw.svc.HTTPService} HTTP service object
 */
function benefitsCalculationsAPI() {
    return LocalServiceRegistry.createService('ease.http.benefitsCalculationsAPI', {
        /**
         * @param {dw.svc.HTTPService} svc
         * @param {object} request object for  benefit calculation
         * @param {boolean} requestType - requestType
         * @returns {string} request body
         */
        createRequest: function (svc, request, requestType) {
            svc.addHeader('Content-Type', 'application/json');
            svc.addHeader('Accept', 'application/json');
            svc.setRequestMethod('POST');
            var authToken = new AuthToken();
            var token = authToken.getValidToken(requestType);
            var bearerToken = 'Bearer ' + token.access_token;
            svc.addHeader('Authorization', bearerToken);
            return JSON.stringify(request);
        },
        /**
         *
         * @param {dw.svc.HTTPService} svc
         * @param {dw.net.HTTPClient} client
         * @returns {{responseObj: Object, isError: boolean, isValidJSON: boolean, errorText: string}}
         */
        parseResponse: function (svc, client) {
            var result;
            var response = {};

            try {
                if (client.statusMessage === 'OK') {
                    response = JSON.parse(client.text);
                } else {
                    response.error = true;
                    response.errorMessage = result.errors[0].message;
                }
            } catch (e) {
                response = client.text;
                Logger.error('Error while fetching the SF Ease benefit calculation Service ' + e);
            }
            return response;
        },
        /**
         *
         * @param {dw.svc.HTTPService} svc
         * @param {object} request
         * @returns {{text: object, statusMessage: string, statusCode: number}}
         */
        // eslint-disable-next-line no-unused-vars
        mockCall: function (svc, request) {
            var response;
            if ('mockResponse' in svc.configuration.custom && !empty(svc.configuration.custom.mockResponse)) {
                response = JSON.parse(svc.configuration.custom.mockResponse);
            } else {
                response = {
                    statusCode: 0,
                    finalOOP: 849.00,
                    deductibleMet: 'Yes',
                    calculationDetails: [
                        {
                            productOOPAmount: 749.00,
                            productName: 'Jabra Enhance Plus',
                            productId: '01t4y00000F6OBHAA3',
                            productCost: 749.00,
                            insurancePlanName: 'ASRS',
                            insurancePlanID: 'a02DC00000GpBmmYAF'
                        },
                        {
                            productOOPAmount: 100.00,
                            productName: 'Serenity Choice Music',
                            productId: '01t4y00000F6O99AAF',
                            productCost: 100.00,
                            insurancePlanName: 'ASRS',
                            insurancePlanID: 'a02DC00000GpBmmYAF'
                        }
                    ]
                };
            }
            return {
                statusCode: 200,
                statusMessage: 'OK',
                text: response
            };
        }
    });
}

// execute and return the benefit calculation
module.exports = benefitsCalculationsAPI();
