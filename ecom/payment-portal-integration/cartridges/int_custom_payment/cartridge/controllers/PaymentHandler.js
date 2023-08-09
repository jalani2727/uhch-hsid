'use strict';

var server = require('server');

/**
 * PaymentHandler-HandleSuccess : This endpoint is called by UPG if payment is successful
 * @name Base/PaymentHandler-HandleSuccess
 * @function
 * @memberof PaymentHandler
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.get('HandleSuccess', server.middleware.https, function (req, res, next) {
    var crypto = require('*/cartridge/scripts/helpers/crypto');
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Transaction = require('dw/system/Transaction');
    var upgServiceHelper = require('*/cartridge/scripts/helpers/upgServiceHelper');
    var preferences = require('*/cartridge/config/preferences.js');
    var StringUtils = require('dw/util/StringUtils');
    var Calendar = require('dw/util/Calendar');
    var URLUtils = require('dw/web/URLUtils');
    var paymentPortalHelper = require('*/cartridge/scripts/helpers/paymentPortalHelper');
    var Logger = require('dw/system/Logger').getLogger('UPGPaymentFlowError', 'UPGPaymentFlowError');
    var urlRedirect = '';

    var invoiceData = {};
    invoiceData.transactionId = req.querystring.transactionId;
    invoiceData.invoiceRecordId = crypto.decrypt(req.querystring.invoiceRecordId);
    invoiceData.invoiceBalance = crypto.decrypt(req.querystring.invoiceBalance);
    invoiceData.patientName = crypto.decrypt(req.querystring.patientName);
    invoiceData.opportunityId = crypto.decrypt(req.querystring.opportunityId);
    invoiceData.invoiceId = crypto.decrypt(req.querystring.invoiceId);

    var providerResponseMessage = req.querystring.providerResponseMessage;
    var co = CustomObjectMgr.getCustomObject('UPGPayment', invoiceData.transactionId);

    var transactionDetails = upgServiceHelper.getFindService(invoiceData.transactionId);
    if (transactionDetails.error) {
        // payment is not received at the UPG end. providerTransactionId is returned empty by find service
        Transaction.wrap(function () {
            if (co) {
                co.custom.status = 'failed';
                co.custom.opportunityId = invoiceData.opportunityId ? invoiceData.opportunityId : '';
                co.custom.providerResponseMessage = providerResponseMessage;
            }
        });
        invoiceData.paymentFail = true;
        session.privacy.paymentPortalInvoiceData = JSON.stringify(invoiceData);
        urlRedirect = URLUtils.url('PaymentPortal-PaymentPage').toString();
        res.render('paymentPortal/paymentPortalRedirect', { urlRedirect: urlRedirect });
    } else {
        var upgCardType = transactionDetails.cardType.split('C')[0];
        var availableCardTypes = preferences.upgCreditCardType_PP;
        invoiceData.cardType = JSON.parse(availableCardTypes)[upgCardType];
        invoiceData.upgTransactionId = transactionDetails.upgTransactionId;
        invoiceData.providerTransactionId = transactionDetails.providerTransactionId;
        invoiceData.accountNumberMasked = (transactionDetails.accountNumberMasked).replace((transactionDetails.accountNumberMasked).charAt(0), '*');
        invoiceData.holderName = transactionDetails.holderName.replace('+', ' ');
        invoiceData.paidAmount = invoiceData.invoiceBalance;

        var transactionDate = Date(transactionDetails.transactionDate);
        invoiceData.formattedTransactionDate = StringUtils.formatCalendar(new Calendar(new Date(transactionDate)), 'MM/dd/yyyy');
        invoiceData.transactionDate = StringUtils.formatCalendar(new Calendar(new Date(transactionDate)), 'yyyy-MM-dd');
        Logger.error('Generating Collection Record for invoice id: ' + invoiceData.invoiceRecordId + ' and transaction id ' + invoiceData.opportunityId);
        var collectionRecordResponseArr = paymentPortalHelper.createCollectionRecord(invoiceData);

        var collectionRecordCreated = true;
        if (collectionRecordResponseArr[1] && collectionRecordResponseArr[1].statusCode > 0) {
            collectionRecordCreated = false;
            Logger.error('Error While generating Collection Record' + collectionRecordResponseArr[1].statusMsg);
        }

        Transaction.wrap(function () {
            if (co) {
                co.custom.status = 'complete';
                co.custom.collectionRecordRequestObj = JSON.stringify(collectionRecordResponseArr[0]);
                co.custom.collectionRecordCreated = collectionRecordCreated;
                co.custom.opportunityId = invoiceData.opportunityId ? invoiceData.opportunityId : '';
                co.custom.providerResponseMessage = providerResponseMessage;
            }
        });

        if (collectionRecordCreated) {
            paymentPortalHelper.removePendingCustomObject(invoiceData.invoiceId);
        }
        invoiceData.emailAddress = co.custom.memberEmailAddress;
        session.privacy.paymentPortalInvoiceData = JSON.stringify(invoiceData);
        urlRedirect = URLUtils.url('PaymentPortal-Confirmation').toString();
        res.render('paymentPortal/paymentPortalRedirect', { urlRedirect: urlRedirect });
    }
    next();
});

/**
 * PaymentHandler-HandleFailure : This endpoint is called by UPG if payment is hard declined
 * @name Base/PaymentHandler-HandleFailure
 * @function
 * @memberof PaymentHandler
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.get('HandleFailure', server.middleware.https, function (req, res, next) {
    // hard decline, refresh the payment page and show error on payment page.
    var crypto = require('*/cartridge/scripts/helpers/crypto');
    var URLUtils = require('dw/web/URLUtils');
    var Transaction = require('dw/system/Transaction');
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');

    var invoiceData = {};
    invoiceData.transactionId = session.privacy.paymentPortalTransactionId;
    delete session.privacy.paymentPortalTransactionId;
    invoiceData.invoiceId = crypto.decrypt(req.querystring.invoiceId);
    invoiceData.invoiceRecordId = crypto.decrypt(req.querystring.invoiceRecordId);
    invoiceData.invoiceBalance = crypto.decrypt(req.querystring.invoiceBalance);
    invoiceData.patientName = crypto.decrypt(req.querystring.patientName);
    invoiceData.opportunityId = crypto.decrypt(req.querystring.opportunityId);
    var errMsg = req.querystring.upgerrmsg;
    invoiceData.paymentFail = true;

    var co = CustomObjectMgr.getCustomObject('UPGPayment', invoiceData.transactionId);
    Transaction.wrap(function () {
        if (co) {
            co.custom.status = 'failed';
            co.custom.opportunityId = invoiceData.opportunityId ? invoiceData.opportunityId : '';
            co.custom.providerResponseMessage = errMsg;
        }
    });
    session.privacy.paymentPortalInvoiceData = JSON.stringify(invoiceData);
    var urlRedirect = URLUtils.url('PaymentPortal-PaymentPage').toString();
    res.render('paymentPortal/paymentPortalRedirect', { urlRedirect: urlRedirect });

    next();
});

module.exports = server.exports();
