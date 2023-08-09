'use strict';

var base = module.superModule;

var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
var Resource = require('dw/web/Resource');    

/**
 * @constructor
 * @classdesc CartModel class that represents the current basket
 * @param {dw.order.Basket} basket - Current users's basket
 */
function CartModel(basket) {
    if (basket !== null) {
        base.call(this, basket);
        this.cartErrorMessages = [];

        var message;
        var isCartError = cartHelper.validateCart(this.items);
        if (isCartError.isOTCPrescription === true || isCartError.isMultiplePrescription === true || isCartError.isDuplicate === true) {
            message = Resource.msg('msg.cart.otc.prescription.error', 'cart', null);
            this.cartErrorMessages.push(message);
        }
        if (isCartError.isExceeding === true) {
            message = Resource.msg('msg.cart.qtyerror', 'cart', null);
            this.cartErrorMessages.push(message);
        }
        if (isCartError.isExceedingOTC === true) {
            message = Resource.msg('msg.cart.qtyerror.otc', 'cart', null);
            this.cartErrorMessages.push(message);
        }
    } else {
        this.items = [];
        this.numItems = 0;
    }
}

module.exports = CartModel;
