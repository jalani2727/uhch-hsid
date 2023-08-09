'use strict';

var URLUtils = require('dw/web/URLUtils');
var Transaction = require('dw/system/Transaction');
var Logger = require('dw/system/Logger');
var logger = Logger.getLogger('UPGError', 'upgservice');

/**
 * UPG Service API call to get the ID.
 * @param {Object} order - order
 * @return {string} upgHPPRedirectEndpointUrl - upgHPPRedirectEndpointUrl
 */
function getIframeUrl(order) {
    var upgHPPRedirectEndpointUrl = '';
    try {
        var UPGService = require('*/cartridge/scripts/services/UPGService');
        var crypto = require('*/cartridge/scripts/helpers/crypto');
        var preferences = require('*/cartridge/config/preferences.js');

        var encryptedOrderNumber = crypto.encrypt(order.orderNo + '|' + order.getOrderToken());
        session.custom.encryptedOrderNumber = encryptedOrderNumber;

        var returnURL = URLUtils.https(preferences.upgReturnURL, 'orderNo', encryptedOrderNumber);
        var cancelURL = URLUtils.https(preferences.upgCancelURL, 'orderNo', encryptedOrderNumber);
        var totalGrossPrice = parseInt((order.totalGrossPrice.value.toFixed(2) * (Math.pow(10, 2))).toFixed(0), 10);
        var requestIDResponse = UPGService.getServiceObj(returnURL, cancelURL, totalGrossPrice, false);
        if (requestIDResponse.error === 401) {
            requestIDResponse = UPGService.getServiceObj(returnURL, cancelURL, totalGrossPrice, true);
        }
        if (requestIDResponse.error === 401) {
            requestIDResponse = UPGService.getServiceObj(returnURL, cancelURL, totalGrossPrice, true);
        }
        if (requestIDResponse.error === 401) {
            requestIDResponse = UPGService.getServiceObj(returnURL, cancelURL, totalGrossPrice, true);
        }

        var splitRequest = requestIDResponse.object.text.split('&');
        var splitRequestID = splitRequest.find(function (element) {
            return element.split('=')[0] === 'requestId';
        });

        // handle if request id is not available
        if (!splitRequestID) {
            throw new Error();
        }

        var upgTransactionId = splitRequest.find(function (element) {
            return element.split('=')[0] === 'transactionId';
        });

        // storing transaction id
        Transaction.wrap(function () {
            // eslint-disable-next-line no-param-reassign
            order.custom.upgTransactionId = upgTransactionId.split('=')[1];
        });

        upgHPPRedirectEndpointUrl = preferences.upgHPPRedirectEndpoint + splitRequestID.split('=')[1];
        return upgHPPRedirectEndpointUrl;
    } catch (e) {
        logger.error('Error while executing UPG service helper.js' + e);
        return upgHPPRedirectEndpointUrl;
    }
}

/**
 * UPG Find Service API call to get the actual status of payment.
 * @param {string} transactionId - transactionId
 * @return {Object} upgTransaction return the result
 */
function getFindService(transactionId) {
    var upgTransaction = { error: false };
    try {
        var UPGFindService = require('*/cartridge/scripts/services/UPGFindService');
        var upgFindServiceResponse = UPGFindService.getTransactionDetailsService(transactionId, false);
        if (upgFindServiceResponse.error === 401) {
            upgFindServiceResponse = UPGFindService.getTransactionDetailsService(transactionId, true);
        }
        var splitResult = upgFindServiceResponse.object.text.split('&');
        var upgTransactionId = splitResult.find(function (element) {
            return element.split('=')[0] === 'transactionId';
        });
        // Customization for UHC
        var providerTransactionId = splitResult.find(function (element) {
            return element.split('=')[0] === 'providerTransactionId';
        });
        var accountNumberMasked = splitResult.find(function (element) {
            return element.split('=')[0] === 'accountNumberMasked';
        });
        var holderName = splitResult.find(function (element) {
            return element.split('=')[0] === 'holderName';
        });

        var cardType = splitResult.find(function (element) {
            return element.split('=')[0] === 'extendedAccountType';
        });
        var providerResponseMessage = splitResult.find(function (element) {
            return element.split('=')[0] === 'providerResponseMessage';
        });
        var responseMessage = splitResult.find(function (element) {
            return element.split('=')[0] === 'responseMessage';
        });
        var amount = splitResult.find(function (element) {
            return element.split('=')[0] === 'amount';
        });
        var transactionDate = splitResult.find(function (element) {
            return element.split('=')[0] === 'transactionDate';
        });

        upgTransaction.providerTransactionId = providerTransactionId ? providerTransactionId.split('=')[1] : '';
        upgTransaction.upgTransactionId = upgTransactionId ? upgTransactionId.split('=')[1] : '';
        upgTransaction.accountNumberMasked = accountNumberMasked ? accountNumberMasked.split('=')[1] : '';
        upgTransaction.holderName = holderName ? holderName.split('=')[1] : '';
        upgTransaction.cardType = cardType ? cardType.split('=')[1] : '';
        upgTransaction.providerResponseMessage = providerResponseMessage;
        upgTransaction.responseMessage = responseMessage;
        upgTransaction.amount = amount ? amount.split('=')[1] : '';
        upgTransaction.transactionDate = transactionDate ? transactionDate.split('=')[1] : '';
        if (upgTransaction.providerTransactionId === '') {
            upgTransaction.error = true;
        }
    } catch (error) {
        logger.error('Error while calling UPG Find service call ' + error);
        upgTransaction.error = true;
    }
    return upgTransaction;
}

module.exports = {
    getIframeUrl: getIframeUrl,
    getFindService: getFindService
};
