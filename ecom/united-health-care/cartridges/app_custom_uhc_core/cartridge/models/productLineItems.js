'use strict';

var base = module.superModule;


/**
 * Creates an array of product line items
 * @param {dw.util.Collection<dw.order.ProductLineItem>} lineItems - All product
 * line items of the basket
 * @returns {Array} an array of product line items.
 */
function soretedLineItems(lineItems) {
    return lineItems.sort(function (a, b) {
        return b.isPriceAvailable - a.isPriceAvailable;
    });
}

/**
 * @constructor
 * @classdesc class that represents a collection of line items and total quantity of
 * items in current basket or per shipment
 *
 * @param {dw.util.Collection<dw.order.ProductLineItem>} productLineItems - the product line items
 *                                                       of the current line item container
 * @param {string} view - the view of the line item (basket or order)
 */
function ProductLineItems(productLineItems, view) {
    base.call(this, productLineItems, view);
    if (productLineItems) {
        this.items = soretedLineItems(this.items);
    }
}

ProductLineItems.getTotalQuantity = base.getTotalQuantity;
module.exports = ProductLineItems;
