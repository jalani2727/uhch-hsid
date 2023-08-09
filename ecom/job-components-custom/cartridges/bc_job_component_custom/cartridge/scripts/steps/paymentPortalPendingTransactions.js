'use strict';

var Transaction = require('dw/system/Transaction');
var Logger = require('dw/system/Logger').getLogger('UPGPaymentJobError', 'UPGPaymentJobError');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var StringUtils = require('dw/util/StringUtils');
var Calendar = require('dw/util/Calendar');
var CustomerMgr = require('dw/customer/CustomerMgr');

/**
 * Helper function to format provierResponse Msg
 */
function formatProviderResponseMessage(resMsg){
    resMsg = resMsg.split('=')[1];
    resMsg = resMsg.split('.')[0]; 
    resMsg = resMsg.replace(/\+/g, ' ');
    return resMsg
}

/**
 * Helper function for collection record.
 */
function collectionRecordHelper(transactionDetails,invoiceData) {
    var preferences = require('*/cartridge/config/preferences.js');
    var paymentPortalHelper = require('*/cartridge/scripts/helpers/paymentPortalHelper');
    var upgCardType = transactionDetails.cardType.split('C')[0];
    var availableCardTypes = preferences.upgCreditCardType_PP;
    invoiceData.cardType = JSON.parse(availableCardTypes)[upgCardType];
    invoiceData.providerTransactionId = transactionDetails.providerTransactionId;
    invoiceData.holderName = transactionDetails.holderName.replace('+', ' ');
    invoiceData.paidAmount = (parseFloat((transactionDetails.amount * (Math.pow(10, -2))).toFixed(2))).toFixed(2);
    var transactionDate = Date(transactionDetails.transactionDate);
    invoiceData.transactionDate = StringUtils.formatCalendar(new Calendar(new Date(transactionDate)), 'yyyy-MM-dd');
    invoiceData.formattedTransactionDate = StringUtils.formatCalendar(new Calendar(new Date(transactionDate)), 'MM/dd/yyyy');
    invoiceData.accountNumberMasked = (transactionDetails.accountNumberMasked).replace((transactionDetails.accountNumberMasked).charAt(0), '*');  
    var collectionRecordResponseArr = paymentPortalHelper.createCollectionRecord(invoiceData);
    collectionRecordResponseArr.push(invoiceData);

    return collectionRecordResponseArr
}


/**
 * Job to verify the UPG payment status and based on that
 * fail or confirm the payment portal transaction.
 *
 */
function execute(args) {
    try {
        Logger.info('Payment Portal: Pending Transactions Job Started'); 

        var upgServiceHelper = require('*/cartridge/scripts/helpers/upgServiceHelper');
        var paymentPortalHelper = require('*/cartridge/scripts/helpers/paymentPortalHelper');

        var status_pending = 'pending';
        var status_complete = 'complete';
        var currentMinusXHour = new Date(new Date().getTime() - (args.BufferInMinutes * 60 * 1000));
        // pick CO list current time - X minutes
        var queryString = '(custom.status = {0} OR (custom.status = {1} AND custom.collectionRecordCreated = {2})) AND creationDate <= {3}';
        var co_list = CustomObjectMgr.queryCustomObjects('UPGPayment', queryString, 'creationDate asc', status_pending, status_complete, false, currentMinusXHour);

        var coTempArr = [];
        
        if (co_list.count > 0) {
            while (co_list.hasNext()) {
                
                var co = co_list.next();
                Logger.info('Processing transactionID :{0} for InvoiceID :{1} ', co.custom.transactionId, co.custom.invoiceId);
                
                var invoiceData = {};
                invoiceData.invoiceId = co.custom.invoiceId;
                invoiceData.invoiceRecordId = co.custom.invoiceRecordId;
                invoiceData.opportunityId = co.custom.opportunityId;
                
                var coTemp = {};
                Object.keys(co.custom).forEach(function (key) {
                    coTemp[key] = co.custom[key];
                });
                coTemp.statusChanged = false;

                var query = 'custom.invoiceId = {0} AND custom.status = {1}';
                var co_complete = CustomObjectMgr.queryCustomObject('UPGPayment', query, invoiceData.invoiceId, status_complete);
                
                if (!co_complete) { 
                    // call Find service
                    var transactionDetails = upgServiceHelper.getFindService(co.custom.transactionId);
                    if (transactionDetails && transactionDetails.error) {
                        // change status to failed
                        if (transactionDetails.providerTransactionId === '') {
                            coTemp.status = 'failed';
                            coTemp.statusChanged = true;
                            coTemp.providerResponseMessage = formatProviderResponseMessage(transactionDetails.providerResponseMessage);
                        } else {
                            Logger.error('Find Service error out for Trasaction ID: {0} ', co.custom.transactionId);
                            continue;
                        }
                    } else {
                        // change status to complete
                        coTemp.status = 'complete';
                        coTemp.providerResponseMessage = formatProviderResponseMessage(transactionDetails.providerResponseMessage);
                        coTemp.statusChanged = true;

                        // create collection record.
                        var collectionRecordResponseArr = collectionRecordHelper(transactionDetails,invoiceData);
                        Object.keys(collectionRecordResponseArr[2]).forEach(function (key) {
                            invoiceData[key] = collectionRecordResponseArr[2][key];
                        });
                        coTemp.collectionRecordCreated = true;
                        if (collectionRecordResponseArr[1] && collectionRecordResponseArr[1].statusCode > 0) {
                            coTemp.collectionRecordCreated = false;
                            Logger.error('Error While generating Collection Record' + collectionRecordResponseArr[1].statusMsg);
                        }
                        coTemp.collectionRecordRequestObj = JSON.stringify(collectionRecordResponseArr[0]);
                        
                        // send email.
                        var profile = {};
                        profile = CustomerMgr.queryProfile('email = {0}', co.custom.memberEmailAddress );
                        paymentPortalHelper.paymentPortalSendEmail(co.custom.memberEmailAddress, profile, true, invoiceData);

                    }
                } else if (co_complete && co_complete.custom && co_complete.custom.transactionId){
                    
                    coTemp.collectionRecordCreated = true;
                    if (co_complete.custom.collectionRecordCreated === false) {
                        // call Find service
                        var transactionDetails = upgServiceHelper.getFindService(co_complete.custom.transactionId);

                        if (transactionDetails && !transactionDetails.error) {
                            // create collection record 
                            var collectionRecordResponseArr = collectionRecordHelper(transactionDetails,invoiceData);
                            Object.keys(collectionRecordResponseArr[2]).forEach(function (key) {
                                invoiceData[key] = collectionRecordResponseArr[2][key];
                            });
                            if (collectionRecordResponseArr[1] && collectionRecordResponseArr[1].statusCode > 0) {
                                coTemp.collectionRecordCreated = false;
                                Logger.error('Error While generating Collection Record' + collectionRecordResponseArr[1].statusMsg);
                            }
                            coTemp.collectionRecordRequestObj = JSON.stringify(collectionRecordResponseArr[0]);
                            
                            // send email.
                            var profile = {};
                            profile = CustomerMgr.queryProfile('email = {0}', co.custom.memberEmailAddress );
                            paymentPortalHelper.paymentPortalSendEmail(co.custom.memberEmailAddress, profile, true, invoiceData);
                        } else {
                            Logger.error('Find Service error out for Trasaction ID: {0} ', co_complete.custom.transactionId);
                            continue;
                        }
                    } 
                    coTemp.status = 'delete';
                    coTemp.statusChanged = true;
                    coTemp.coCompleteTxnId = co_complete.custom.transactionId;
                }
                coTempArr.push(coTemp);
            }
        }
        Transaction.wrap(function () {
            coTempArr.forEach(function(coTemp){
                // get the co using coTemp.transactionId
                var co = CustomObjectMgr.getCustomObject('UPGPayment', coTemp.transactionId);
                if (coTemp.statusChanged === true){
                    if(co && co.custom && coTemp.status === 'complete'){
                        // delete all other txn for this Invoice ID except coTemp.transactionID and update this txn with CoTemp.
                        co.custom.status = coTemp.status;
                        co.custom.collectionRecordRequestObj = coTemp.collectionRecordRequestObj;
                        co.custom.collectionRecordCreated = coTemp.collectionRecordCreated;
                        co.custom.providerResponseMessage = coTemp.providerResponseMessage;
                        var queryString = 'custom.transactionId != {0} AND custom.invoiceId = {1} AND custom.status = {2}';
                        var co_delete_list = CustomObjectMgr.queryCustomObjects('UPGPayment', queryString, 'creationDate asc', coTemp.transactionId, coTemp.invoiceId, status_pending);
                        while(co_delete_list.hasNext()){
                            CustomObjectMgr.remove(co_delete_list.next());
                        }
                    } else if ( co && co.custom && coTemp.status === 'delete') {
                        //  delete this custom object i.e coTemp.transactionID and mark the completed collection record created as true.
                        var co_complete = CustomObjectMgr.getCustomObject('UPGPayment', coTemp.coCompleteTxnId);
                        co_complete.custom.collectionRecordCreated = coTemp.collectionRecordCreated;
                        co_complete.custom.collectionRecordRequestObj = coTemp.collectionRecordRequestObj;
                        if (co_complete.custom.transactionId !== co.custom.transactionId) {
                            CustomObjectMgr.remove(co);
                        }
                    } else if (co && co.custom && coTemp.status === 'failed' ) {
                        // update the co with this status.
                        co.custom.status = 'failed';
                        co.custom.providerResponseMessage = coTemp.providerResponseMessage;
                    }
                }
            });
        });
        Logger.info('Payment Portal: Pending Transactions Job complete');
    } catch (error) {
        Logger.error('error while executing the UPayment Portal: Pending Transactions Job' + error);
    }
}

module.exports.execute = execute;
