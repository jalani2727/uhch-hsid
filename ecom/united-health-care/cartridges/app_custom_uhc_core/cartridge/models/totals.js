'use strict';

var base = module.superModule;
var formatMoney = require('dw/util/StringUtils').formatMoney;
var collections = require('*/cartridge/scripts/util/collections');
var HashMap = require('dw/util/HashMap');
var Template = require('dw/util/Template');
var Money = require('dw/value/Money');

/**
 * Adds discounts to a discounts object
 * @param {dw.util.Collection} collection - a collection of price adjustments
 * @param {Object} discounts - an object of price adjustments
 * @returns {Object} an object of price adjustments
 */
function createDiscountObject(collection, discounts) {
    var result = discounts;
    collections.forEach(collection, function (item) {
        if (!item.basedOnCoupon) {
            result[item.UUID] = {
                UUID: item.UUID,
                lineItemText: item.lineItemText,
                price: formatMoney(item.price),
                type: 'promotion',
                callOutMsg: (typeof item.promotion !== 'undefined' && item.promotion !== null) ? item.promotion.calloutMsg : ''
            };
        }
    });

    return result;
}

/**
 * creates an array of discounts.
 * @param {dw.order.LineItemCtnr} lineItemContainer - the current line item container
 * @returns {Array} an array of objects containing promotion and coupon information
 */
function getDiscounts(lineItemContainer) {
    var discounts = {};

    collections.forEach(lineItemContainer.couponLineItems, function (couponLineItem) {
        var totalSavedPrice = 0;
        var priceAdjustments = collections.map(
            couponLineItem.priceAdjustments, function (priceAdjustment) {
                if (priceAdjustment.basedOnCoupon) {
                    totalSavedPrice += priceAdjustment.price.value;
                }
                return { callOutMsg: (typeof priceAdjustment.promotion !== 'undefined' && priceAdjustment.promotion !== null) ? priceAdjustment.promotion.calloutMsg : '' };
            });
        discounts[couponLineItem.UUID] = {
            type: 'coupon',
            UUID: couponLineItem.UUID,
            couponCode: couponLineItem.couponCode,
            applied: couponLineItem.applied,
            valid: couponLineItem.valid,
            totalSavePrice: formatMoney(new Money(Math.abs(totalSavedPrice), lineItemContainer.currencyCode)),
            relationship: priceAdjustments
        };
    });

    discounts = createDiscountObject(lineItemContainer.priceAdjustments, discounts);
    discounts = createDiscountObject(lineItemContainer.allShippingPriceAdjustments, discounts);

    return Object.keys(discounts).map(function (key) {
        return discounts[key];
    });
}

/**
 * create the discount results html
 * @param {Array} discounts - an array of objects that contains coupon and priceAdjustment
 * information
 * @returns {string} The rendered HTML
 */
function getDiscountsHtml(discounts) {
    var context = new HashMap();
    var object = { totals: { discounts: discounts } };

    Object.keys(object).forEach(function (key) {
        context.put(key, object[key]);
    });

    var template = new Template('cart/cartCouponDisplay');
    return template.render(context).text;
}

/**
 * add benefitAmount to product line item
 * @param {Array} lineItemContainer - the current line item container
 * information
 * @returns {Object} an object of price adjustments
 */
function getProductLevelDiscounts(lineItemContainer) {
    var benefitAmount = 0;
    collections.forEach(lineItemContainer.productLineItems, function (productLineItem) {
        collections.map(
            productLineItem.priceAdjustments,
            function (priceAdjustment) {
                if (priceAdjustment.appliedDiscount && priceAdjustment.appliedDiscount.amount) {
                    benefitAmount += priceAdjustment.appliedDiscount.amount;
                }
            });
    }
    );
    session.privacy.OTCBenefitInCart = benefitAmount;
    return {
        value: benefitAmount,
        formatted: formatMoney(new Money(benefitAmount, lineItemContainer.currencyCode))
    };
}

/**
 * Accepts a total object and formats the value
 * @param {dw.value.Money} total - Total price of the cart
 * @returns {string} the formatted money value
 */
function getTotals(total) {
    return !total.available ? '-' : formatMoney(total);
}

/**
 * @constructor
 * @classdesc totals class that represents the order totals of the current line item container
 *
 * @param {dw.order.lineItemContainer} lineItemContainer - The current user's line item container
 */
module.exports = function totals(lineItemContainer) {
    if (lineItemContainer) {
        base.call(this, lineItemContainer);
        this.discounts = getDiscounts(lineItemContainer);
        this.discountsHtml = getDiscountsHtml(this.discounts);
        this.productLevelDiscounts = getProductLevelDiscounts(lineItemContainer);
        this.subTotal = getTotals(lineItemContainer.merchandizeTotalPrice);
    }
};
