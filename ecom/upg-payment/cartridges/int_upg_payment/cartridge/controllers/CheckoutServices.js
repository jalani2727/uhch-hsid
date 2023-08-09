'use strict';

var server = require('server');
server.extend(module.superModule);

/**
 * CheckoutServices-PlaceOrder : The CheckoutServices-PlaceOrder endpoint places the order
 * @name Base/CheckoutServices-PlaceOrder
 * @function
 * @memberof CheckoutServices
 * @param {middleware} - server.middleware.https
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - replace
 */
server.replace('PlaceOrder', server.middleware.https, function (req, res, next) {
    var transactionId = req.querystring.transactionId;
    var upgServiceHelper = require('*/cartridge/scripts/helpers/upgServiceHelper');
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var Transaction = require('dw/system/Transaction');
    var OrderMgr = require('dw/order/OrderMgr');
    var URLUtils = require('dw/web/URLUtils');
    var crypto = require('*/cartridge/scripts/helpers/crypto');
    var orderSuccess = true;
    var urlredirect = URLUtils.url('Cart-Show').toString();
    var order;

    if ('zeroOrder' in req.querystring && req.querystring.zeroOrder === 'true') {
        order = OrderMgr.getOrder(req.querystring.orderNo);
    } else {
        var encryptedOrderNumber = crypto.decrypt(req.querystring.orderNo);
        var splitOrderNumber = encryptedOrderNumber.split('|');
        var orderNumber = splitOrderNumber[0];
        var orderToken = splitOrderNumber[1];

        order = OrderMgr.getOrder(orderNumber, orderToken);

        // Handles payment authorization
        if (empty(order.custom.appID)) {
            COHelpers.updateCustomerDataToOrder(order);
        }
        var handlePaymentResult = COHelpers.handlePayments(order, order.orderNo, transactionId);
        if (handlePaymentResult.error) {
            Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
            orderSuccess = false;
        }
    }

    // Places the order
    if (orderSuccess) {
        var placeOrderResult = COHelpers.placeOrder(order);
        if (!placeOrderResult.error) {
            if (order.customer.addressBook) {
                var addressHelpers = require('*/cartridge/scripts/helpers/addressHelpers');
                // save all used shipping addresses to address book of the logged in customer
                var allAddresses = addressHelpers.gatherShippingAddresses(order);
                allAddresses.forEach(function (address) {
                    if (!addressHelpers.checkIfAddressStored(address, order.customer.addressBook.addresses)) {
                        addressHelpers.saveAddress(address, order.customer, 'Shipping Address');
                    }
                });
            }

            if (order.getCustomerEmail()) {
                COHelpers.sendConfirmationEmail(order, req.locale.id);
            }
            delete session.custom.currentOrderNo;
            urlredirect = URLUtils.url('Order-Confirm').toString();
        }
    }

    res.render('upg/upgpaymentredirect', {
        urlredirect: urlredirect
    });
    return next();
});

/**
 * CheckoutServices-FailOrder : The CheckoutServices-FailOrder endpoint places the order
 * @name Base/CheckoutServices-FailOrder
 * @function
 * @memberof CheckoutServices
 * @param {middleware} - server.middleware.https
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - get
 */
server.get('FailOrder', server.middleware.https, function (req, res, next) {
    var OrderMgr = require('dw/order/OrderMgr');
    var Transaction = require('dw/system/Transaction');
    var URLUtils = require('dw/web/URLUtils');
    var crypto = require('*/cartridge/scripts/helpers/crypto');

    var encryptedOrderNumber = crypto.decrypt(req.querystring.orderNo);
    var splitOrderNumber = encryptedOrderNumber.split('|');
    var orderNumber = splitOrderNumber[0];
    var orderToken = splitOrderNumber[1];
    var order = OrderMgr.getOrder(orderNumber, orderToken);

    Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
    delete session.custom.currentOrderNo;
    var urlredirect = URLUtils.url('Checkout-Begin', 'stage', 'payment', 'valid', 'false').toString();
    res.render('upg/upgpaymentredirect', {
        urlredirect: urlredirect
    });
    return next();
});

module.exports = server.exports();
