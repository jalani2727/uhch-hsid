'use strict';

/**
 * @namespace Checkout
 */

var server = require('server');
server.extend(module.superModule);
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

/**
 * Checkout-Begin : The Checkout-Begin endpoint will render the checkout shipping page for both guest shopper and returning shopper
 * @name Base/Checkout-Begin
 * @function
 * @memberof Checkout
 * @param {middleware} - server.middleware.https
 * @param {middleware} - consentTracking.consent
 * @param {middleware} - csrfProtection.generateToken
 * @param {querystringparameter} - stage - a flag indicates the checkout stage
 * @param {category} - sensitive
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.append(
    'Begin',
    csrfProtection.generateToken,
    function (req, res, next) {
        var BasketMgr = require('dw/order/BasketMgr');
        var Transaction = require('dw/system/Transaction');
        var AccountModel = require('*/cartridge/models/account');
        var URLUtils = require('dw/web/URLUtils');
        var currentStage = req.querystring.stage;
        var isValidCard = req.querystring.valid;

        if (currentStage === 'payment' || isValidCard === 'false') {
            var Resource = require('dw/web/Resource');
            var HookMgr = require('dw/system/HookMgr');
            var PaymentMgr = require('dw/order/PaymentMgr');
            var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
            var hooksHelper = require('*/cartridge/scripts/helpers/hooks');

            var paymentMethodID = 'CREDIT_CARD';
            var processor = PaymentMgr.getPaymentMethod(paymentMethodID).getPaymentProcessor();
            if (!processor) {
                throw new Error(Resource.msg(
                    'error.payment.processor.missing',
                    'checkout',
                    null
                ));
            }

            var currentBasket = BasketMgr.getCurrentBasket();

            var billingData = res.getViewData();

            var result;

            // if there is no selected payment option and balance is greater than zero
            if (!paymentMethodID && currentBasket.totalGrossPrice.value > 0) {
                var noPaymentMethod = {};

                noPaymentMethod[billingData.paymentMethod.htmlName] =
                    Resource.msg('error.no.selected.payment.method', 'payment', null);

                delete billingData.paymentInformation;

                res.json({
                    // form: billingForm,
                    fieldErrors: [noPaymentMethod],
                    serverErrors: [],
                    error: true
                });
                return;
            }

            // check to make sure there is a payment processor
            if (HookMgr.hasHook('app.payment.processor.' + processor.ID.toLowerCase())) {
                result = HookMgr.callHook('app.payment.processor.' + processor.ID.toLowerCase(),
                    'Handle',
                    currentBasket,
                    billingData.paymentInformation,
                    paymentMethodID,
                    req
                );
            } else {
                result = HookMgr.callHook('app.payment.processor.default', 'Handle');
            }

            // need to invalidate credit card fields
            if (result.error) {
                delete billingData.paymentInformation;

                res.json({
                    fieldErrors: result.fieldErrors,
                    serverErrors: result.serverErrors,
                    error: true
                });
                return;
            }

            // Calculate the basket
            Transaction.wrap(function () {
                basketCalculationHelpers.calculateTotals(currentBasket);
            });

            // Re-calculate the payments.
            var calculatedPaymentTransaction = COHelpers.calculatePaymentTransaction(
                currentBasket
            );

            if (calculatedPaymentTransaction.error) {
                res.json({
                    fieldErrors: [],
                    serverErrors: [Resource.msg('error.technical', 'checkout', null)],
                    error: true
                });
                return;
            }

            var accountModel = new AccountModel(req.currentCustomer);
            // eslint-disable-next-line no-unused-vars
            var renderedStoredPaymentInstrument = COHelpers.getRenderedPaymentInstruments(
                req,
                accountModel
            );

            delete billingData.paymentInformation;

            // order creation flow start
            if (req.session.privacyCache.get('fraudDetectionStatus')) {
                res.json({
                    error: true,
                    cartError: true,
                    redirectUrl: URLUtils.url('Error-ErrorCode', 'err', '01').toString(),
                    errorMessage: Resource.msg('error.technical', 'checkout', null)
                });

                return;
            }

            var validationOrderStatus = hooksHelper('app.validate.order', 'validateOrder', currentBasket, require('*/cartridge/scripts/hooks/validateOrder').validateOrder);
            if (validationOrderStatus.error) {
                res.json({
                    error: true,
                    errorMessage: validationOrderStatus.message
                });
                return;
            }

            // Check to make sure there is a shipping address
            if (currentBasket.defaultShipment.shippingAddress === null) {
                res.json({
                    error: true,
                    errorStage: {
                        stage: 'shipping',
                        step: 'address'
                    },
                    errorMessage: Resource.msg('error.no.shipping.address', 'checkout', null)
                });
                return;
            }

            // Check to make sure billing address exists
            if (!currentBasket.billingAddress) {
                res.json({
                    error: true,
                    errorStage: {
                        stage: 'payment',
                        step: 'billingAddress'
                    },
                    errorMessage: Resource.msg('error.no.billing.address', 'checkout', null)
                });
                return;
            }

            // Re-validates existing payment instruments
            var validPayment = COHelpers.validatePayment(req, currentBasket);
            if (validPayment.error) {
                res.json({
                    error: true,
                    errorStage: {
                        stage: 'payment',
                        step: 'paymentInstrument'
                    },
                    errorMessage: Resource.msg('error.payment.not.valid', 'checkout', null)
                });
                return;
            }

            // Re-calculate the payments.
            var calculatedPaymentTransactionTotal = COHelpers.calculatePaymentTransaction(currentBasket);
            if (calculatedPaymentTransactionTotal.error) {
                res.json({
                    error: true,
                    errorMessage: Resource.msg('error.technical', 'checkout', null)
                });
                return;
            }
            if (currentBasket && currentBasket.totalNetPrice.value === 0) {
                if (req.querystring.zeroOrder === 'true') {
                    const OrderMgr = require('dw/order/OrderMgr');
                    var orderNumber = OrderMgr.createOrderNo();
                    Transaction.wrap(function () {
                        order = OrderMgr.createOrder(currentBasket, orderNumber);
                    });
                } else {
                    res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'shipping').toString());
                    return next();
                }
            } else {
                // Creates a new order.
                var order = COHelpers.createOrder(currentBasket);
            }
            if (!order) {
                res.json({
                    error: true,
                    errorMessage: Resource.msg('error.technical', 'checkout', null)
                });
                return;
            }
            session.custom.currentOrderNo = order.orderNo;
            COHelpers.updateCustomerDataToOrder(order);

            var servicehelper = require('*/cartridge/scripts/helpers/upgServiceHelper');
            var iframeURL = servicehelper.getIframeUrl(order);

            billingData.iframeUrl = iframeURL && currentBasket.totalNetPrice.value > 0 ? iframeURL : URLUtils.url('CheckoutServices-PlaceOrder', 'orderNo', order.orderNo, 'zeroOrder', 'true').toString();
            billingData.createdOrder = order;
            billingData.valid = isValidCard;
            billingData.errorMsg = Resource.msg('error.upgcredit.decline', 'checkout', null);
            res.setViewData(billingData);
        }
        // eslint-disable-next-line consistent-return
        return next();
    }
);

module.exports = server.exports();