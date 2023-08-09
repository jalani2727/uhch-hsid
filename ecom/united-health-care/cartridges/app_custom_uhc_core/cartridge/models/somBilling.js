'use strict';
var Address = require('*/cartridge/models/somAddress');
var Payment = require('*/cartridge/models/somPayment');

/**
 * Create a SOM billing model
 * Changed this for not using account from response
 * @param  {Object} somApiOrderSummary - OrderSummaryObject from SOM API in JSON format
 * @param  {Object} somOrderToOrderPaymentSummariesMap - the map of SOM somOrderToOrderPaymentSummariesMap to OrderItemsSummaries
 */
function SomBilling(somApiOrderSummary, somOrderToOrderPaymentSummariesMap) {
    var Account = {};
    this.payment = new Payment(somOrderToOrderPaymentSummariesMap, somApiOrderSummary.Id, somApiOrderSummary.OrderPaymentSummaries.records[0].PaymentMethodId);
    if (this.payment && this.payment.CardHolderName && this.payment.CardHolderName !== '-') {
        var separator = this.payment.CardHolderName.indexOf(' ');
        if (separator !== -1) {
            Account.FirstName = this.payment.CardHolderName.slice(0, separator);
            Account.LastName = this.payment.CardHolderName.slice(separator + 1);
        }
    }
    if (somApiOrderSummary.BillingPhoneNumber) {
        Account.Phone = somApiOrderSummary.BillingPhoneNumber;
    }
    if (somApiOrderSummary.BillingEmailAddress) {
        Account.PersonEmail = somApiOrderSummary.BillingEmailAddress;
    }

    this.address = new Address(somApiOrderSummary.BillingAddress, Account);
}

module.exports = SomBilling;
