'use strict';

var base = module.superModule;
var ProductMgr = require('dw/catalog/ProductMgr');
var Resource = require('dw/web/Resource');
var collections = require('*/cartridge/scripts/util/collections');
var productHelper = require('*/cartridge/scripts/helpers/productHelpers');
var preferences = require('*/cartridge/config/preferences');
var OTC_MAX_ORDER_QUANTITY = preferences.otcMaxOrderQty || 5;
var OTC_BENEFIT_ID = 'OTCBENEFIT';
var Transaction = require('dw/system/Transaction');

/**
 * Check if the bundled product can be added to the cart
 * @param {string[]} childProducts - the products' sub-products
 * @param {dw.util.Collection<dw.order.ProductLineItem>} productLineItems - Collection of the Cart's
 *     product line items
 * @param {number} quantity - the number of products to the cart
 * @return {boolean} - return true if the bundled product can be added
 */
base.checkBundledProductCanBeAdded = function checkBundledProductCanBeAdded(childProducts, productLineItems, quantity) {
    var inventoryHelpers = require('*/cartridge/scripts/helpers/inventoryHelpers');

    var totalQtyRequested = 0;
    var canBeAdded = false;

    canBeAdded = childProducts.every(function (childProduct) {
        var apiChildProduct = ProductMgr.getProduct(childProduct.pid);
        var bundleQuantity = quantity;
        var itemQuantity = bundleQuantity * childProduct.quantity;
        var childPid = childProduct.pid;
        totalQtyRequested = itemQuantity + base.getQtyAlreadyInCart(childPid, productLineItems);
        var pli = collections.find(productLineItems, function (item) {
            if (item.bundledProductLineItems.length) {
                return collections.find(item.bundledProductLineItems, function (bundleItem) {
                    return bundleItem.productID === childPid;
                });
            }
            return item.productID === childPid;
        });
        return inventoryHelpers.isAvailableToSell(pli && pli.productInventoryListID, apiChildProduct.availabilityModel.inventoryRecord, totalQtyRequested);
    });

    return canBeAdded;
};

/**
 * Adds a product to the cart. If the product is already in the cart it increases the quantity of
 * that product.
 * @param {dw.order.Basket} currentBasket - Current users's basket
 * @param {string} productId - the productId of the product being added to the cart
 * @param {number} quantity - the number of products to the cart
 * @param {string[]} childProducts - the products' sub-products
 * @param {SelectedOption[]} options - product options
 * @param {string} prescriptionEartype - eartype for prescription product
 * @return {Object} returns an error object
 */
base.addProductToCart = function addProductToCart(currentBasket, productId, quantity, childProducts, options, prescriptionEartype) {
    var inventoryHelpers = require('*/cartridge/scripts/helpers/inventoryHelpers');
    var defaultShipment = currentBasket.defaultShipment;
    var product = ProductMgr.getProduct(productId);
    var productInCart;
    var productLineItems = currentBasket.productLineItems;
    var productQuantityInCart;
    var quantityToSet;
    var Site = require('dw/system/Site');
    var optionModel = productHelper.getCurrentOptionModel(product.optionModel, options);
    var result = {
        error: false,
        message: Resource.msg('text.alert.addedtobasket', 'product', null)
    };
    var totalQtyRequested = 0;
    var canBeAdded = false;

    productInCart = base.getExistingProductLineItemInCart(
        product, productId, productLineItems, childProducts, options);
    if (product.custom.isPrescriptionProduct && Site.current.getCustomPreferenceValue('enableTraditionalProduct')) {
        canBeAdded = base.checkPrescriptionProduct(product, productLineItems, prescriptionEartype);
    } else if (product.custom.isOTCProduct) {
        var qtyAlreadyInCart = base.getQtyAlreadyInCart(productId, productLineItems);
        canBeAdded = base.checkOTCProduct(product, productLineItems, qtyAlreadyInCart, quantity);
    } else if (product.bundle) {
        canBeAdded = base.checkBundledProductCanBeAdded(childProducts, productLineItems, quantity);
    } else {
        totalQtyRequested = quantity + base.getQtyAlreadyInCart(productId, productLineItems);
        canBeAdded = inventoryHelpers.isAvailableToSell(productInCart && productInCart.productInventoryListID, product.availabilityModel.inventoryRecord, totalQtyRequested);
    }


    if (!canBeAdded) {
        result.error = true;
        if (product.custom.isPrescriptionProduct && Site.current.getCustomPreferenceValue('enableTraditionalProduct')) {
            result.message = Resource.msgf(
                'error.alert.selected.prescription.product.cannot.be.added',
                'product',
                null,
                product.name
            );
        } else if (product.custom.isOTCProduct) {
            result.message = Resource.msgf(
                'error.alert.selected.otc.product.cannot.be.added',
                'product',
                null,
                product.name
            );
        } else {
            result.message = Resource.msgf(
                'error.alert.selected.quantity.cannot.be.added.for',
                'product',
                null,
                (product.availabilityModel.inventoryRecord.ATS && product.availabilityModel.inventoryRecord.ATS.value) || 0,
                product.name
            );
        }
        return result;
    }

    if (productInCart && !(product.custom.isPrescriptionProduct && Site.current.getCustomPreferenceValue('enableTraditionalProduct'))) {
        productQuantityInCart = productInCart.quantity.value;
        quantityToSet = quantity ? quantity + productQuantityInCart : productQuantityInCart + 1;
        var inventoryRecord = productInCart.product.availabilityModel.inventoryRecord;

        if (inventoryHelpers.isAvailableToSell(productInCart.productInventoryListID, inventoryRecord, quantityToSet)) {
            productInCart.setQuantityValue(quantityToSet);
            result.uuid = productInCart.UUID;
        } else {
            result.error = true;
            var availableToSell = (inventoryRecord.ATS && inventoryRecord.ATS.value) || 0;
            result.message = availableToSell === productQuantityInCart
                ? Resource.msg('error.alert.max.quantity.in.cart', 'product', null)
                : Resource.msg('error.alert.selected.quantity.cannot.be.added', 'product', null);
        }
    } else {
        // eslint-disable-next-line no-lonely-if
        if (prescriptionEartype === 'B') {
            var lineItems;

            lineItems = base.addLineItems(
                currentBasket,
                product,
                1,
                childProducts,
                optionModel,
                defaultShipment
            );
            if (prescriptionEartype) {
                lineItems[0].custom.earType = 'L';
                lineItems[1].custom.earType = 'R';
            }
            lineItems[0].custom.brand = product.brand;
            lineItems[0].custom.manufacturerName = product.manufacturerName;
            lineItems[0].custom.manufacturerSKU = product.manufacturerSKU;

            lineItems[1].custom.brand = product.brand;
            lineItems[1].custom.manufacturerName = product.manufacturerName;
            lineItems[1].custom.manufacturerSKU = product.manufacturerSKU;

            result.uuid = lineItems[0].UUID;
        } else {
            var lineItem;
            var selectedQuantity = prescriptionEartype ? 1 : quantity;
            lineItem = base.addLineItem(
                currentBasket,
                product,
                selectedQuantity,
                childProducts,
                optionModel,
                defaultShipment
            );
            if (prescriptionEartype) {
                lineItem.custom.earType = prescriptionEartype;
            }
            // Added to submit to marketing cloud
            lineItem.custom.brand = product.brand;
            lineItem.custom.manufacturerName = product.manufacturerName;
            lineItem.custom.manufacturerSKU = product.manufacturerSKU;
            result.uuid = lineItem.UUID;
        }
    }
    return result;
};

/**
 * return the maxDiscount amount to be added in PriceAdjustment based on OTCBenefitRemaining
 * @param {productLineItem} productLineItem - the productLineItem being added to the cart
 * @return {boolean} - returns true if isOTCBenefitApplicable
 */
function getDiscountAmount(productLineItem) {
    var benefitRemaining;
    if (session.privacy.OTCBenefitInCart > 0) {
        benefitRemaining = session.privacy.OTCBenefitTotal - session.privacy.OTCBenefitInCart;
    } else {
        benefitRemaining = session.privacy.OTCBenefitRemaining;
    }
    var price = productLineItem.product.priceModel.price.value;
    var quantity = productLineItem.quantityValue;
    var productPrice = price * quantity;
    var maxAmountDiscount;
    if (productPrice > 0 && benefitRemaining > 0) {
        if (benefitRemaining >= productPrice) {
            maxAmountDiscount = productPrice;
        } else {
            maxAmountDiscount = benefitRemaining;
        }
    } else {
        maxAmountDiscount = 0;
    }
    // if (maxAmountDiscount > 0) {
    //     session.privacy.OTCBenefitRemaining = benefitTotal - maxAmountDiscount;
    // }
    return maxAmountDiscount;
}

/**
 * Adds multiple line items for product with custom eartype to the Cart
 *
 * @param {dw.order.Basket} currentBasket - current basket instance
 * @param {dw.catalog.Product} product - product object
 * @param {number} quantity - Quantity to add
 * @param {string[]}  childProducts - the products' sub-products
 * @param {dw.catalog.ProductOptionModel} optionModel - the product's option model
 * @param {dw.order.Shipment} defaultShipment - the cart's default shipment method
 * @return {dw.order.ProductLineItem} - array of added product line items
 */
base.addLineItems = function addLineItems(
    currentBasket,
    product,
    quantity,
    childProducts,
    optionModel,
    defaultShipment
) {
    var productLineItems = [];
    for (var i = 0; i < 2; i++) {
        var productLineItem = currentBasket.createProductLineItem(
            product,
            optionModel,
            defaultShipment
        );
        if (product.bundle && childProducts.length) {
            base.updateBundleProducts(productLineItem, childProducts);
        }
        productLineItem.setQuantityValue(quantity);
        productLineItems.push(productLineItem);
    }

    return productLineItems;
};

/**
 * Adds a line item for this product to the Cart
 *
 * @param {dw.order.Basket} currentBasket -
 * @param {dw.catalog.Product} product -
 * @param {number} quantity - Quantity to add
 * @param {string[]}  childProducts - the products' sub-products
 * @param {dw.catalog.ProductOptionModel} optionModel - the product's option model
 * @param {dw.order.Shipment} defaultShipment - the cart's default shipment method
 * @return {dw.order.ProductLineItem} - The added product line item
 */
base.addLineItem = function addLineItem(
    currentBasket,
    product,
    quantity,
    childProducts,
    optionModel,
    defaultShipment
) {
    var productLineItem = currentBasket.createProductLineItem(
        product,
        optionModel,
        defaultShipment
    );

    if (product.bundle && childProducts.length) {
        base.updateBundleProducts(productLineItem, childProducts);
    }
    // .custom.isOTCProduct
    if (productLineItem.product.custom.isOTCProduct) {
        base.applyPriceAdjustment(productLineItem);
    }
    productLineItem.setQuantityValue(quantity);

    return productLineItem;
};

/**
 * Calculate the quantities for any existing instance of a product, either as a single line item
 * with the same or different options, as well as inclusion in product bundles.  Providing an
 * optional "uuid" parameter, typically when updating the quantity in the Cart, will exclude the
 * quantity for the matching line item, as the updated quantity will be used instead.  "uuid" is not
 * used when adding a product to the Cart.
 *
 * @param {string} product - product to be added or updated
 * @param {dw.util.Collection<dw.order.ProductLineItem>} lineItems - Cart product line items
 * @param {string} prescriptionEartype - prescriptionEartype of product
 * @return {number} - Total quantity of all instances of requested product in the Cart and being
 *     requested
 */
base.checkPrescriptionProduct = function checkPrescriptionProduct(product, lineItems, prescriptionEartype) {
    var canAdd = true;
    collections.forEach(lineItems, function (item) {
        if (item.product.ID === product.ID) {
            if (prescriptionEartype !== 'B') {
                if (item.custom.earType === prescriptionEartype) {
                    canAdd = false;
                }
            } else {
                // eslint-disable-next-line no-lonely-if
                if (item.custom.earType === 'L' || item.custom.earType === 'R') {
                    canAdd = false;
                }
            }
        }
    });
    return canAdd;
};

/**
 * Validates basket lineitems and checks if basket is having duplicate
 * Traditional products
 * @param {array} lineItems - Array of lineitems added in basket
 * @return {boolean} - returns true if it finds duplicate items
 */
base.validateCart = function validateCart(lineItems) {
    var lineItemType = {
        L: 0,
        R: 0
    };
    var productType = {
        isPrescriptionProduct: 0,
        isOTCProduct: 0
    };
    var canAdd;
    var prescriptionProducts = [];
    var prescriptionObj = {};
    var Site = require('dw/system/Site');
    var maxOrderQuantity = Site.current.getCustomPreferenceValue('maxOrderQuantity') || 10;
    var result = {
        isExceeding: false,
        isDuplicate: false,
        isExceedingOTC: false,
        isOTCPrescription: false,
        isMultiplePrescription: false
    };
    lineItems.forEach(function (lineItem) {
        if (lineItem instanceof dw.order.ProductLineItem) {
            if (lineItem.custom.earType === 'L' || lineItem.custom.earType === 'R') {
                lineItemType[lineItem.custom.earType]++;
                productType.isPrescriptionProduct += 1;
                prescriptionObj = {
                    id: lineItem.product.ID,
                    earType: lineItem.custom.earType
                };
                if (prescriptionProducts.length) {
                    // if any prescription product already in cart, can add if same id and different eartype
                    canAdd = base.checkPrescriptionId(prescriptionProducts, prescriptionObj);
                    if (canAdd) {
                        prescriptionProducts.push(prescriptionObj);
                    } else {
                        result.isMultiplePrescription = true;
                    }
                } else {
                    // add the first prescription obj in cart
                    prescriptionProducts.push(prescriptionObj);
                }
            } else if (lineItem.product.custom.isAccessories || lineItem.product.custom.isSupplies || lineItem.product.custom.isOTCProduct) {
                if (lineItem.quantity > maxOrderQuantity) {
                    result.isExceeding = true;
                }
                if (lineItem.product.custom.isOTCProduct) {
                    productType.isOTCProduct += 1;
                    if (lineItem.quantity > OTC_MAX_ORDER_QUANTITY) {
                        result.isExceedingOTC = true;
                    }
                }
            }
        } else if (lineItem.earType === 'L' || lineItem.earType === 'R') {
            lineItemType[lineItem.earType]++;
            productType.isPrescriptionProduct += 1;
            prescriptionObj = {
                id: lineItem.id,
                earType: lineItem.earType
            };
            if (prescriptionProducts.length) {
                canAdd = base.checkPrescriptionId(prescriptionProducts, prescriptionObj);
                if (canAdd) {
                    prescriptionProducts.push(prescriptionObj);
                } else {
                    result.isMultiplePrescription = true;
                }
            } else {
                prescriptionProducts.push(prescriptionObj);
            }
        } else if (lineItem.isAccessories || lineItem.isSupplies || lineItem.isOTCProduct) {
            if (lineItem.quantity > maxOrderQuantity) {
                result.isExceeding = true;
            }
            if (lineItem.isOTCProduct) {
                productType.isOTCProduct += 1;
                if (lineItem.quantity > OTC_MAX_ORDER_QUANTITY) {
                    result.isExceedingOTC = true;
                }
            }
        }
    });
    if (lineItemType.L > 1 || lineItemType.R > 1) {
        result.isDuplicate = true;
    }
    if (productType.isPrescriptionProduct >= 1 && productType.isOTCProduct >= 1) {
        result.isOTCPrescription = true;
    }
    return result;
};

/**
 * Calculates if the OTC product quantity added to the basket exceeds the max
 * quantity of 2 in basket and disallows if the basket already has an OTC product
 *
 * @param {string} product - product to be added or updated
 * @param {dw.util.Collection<dw.order.ProductLineItem>} lineItems - Cart product line items
 * @param {string} qtyAlreadyInCart - quantity of product in basket
 * @param {string} quantity - quantity to be added to the basket
 * @return {canAdd} - if the product quantity can be added
 */
base.checkOTCProduct = function checkOTCProduct(product, lineItems, qtyAlreadyInCart, quantity) {
    var canAdd = true;
    collections.forEach(lineItems, function (item) {
        if (item.product.ID === product.ID) {
            if (qtyAlreadyInCart + quantity > OTC_MAX_ORDER_QUANTITY) {
                canAdd = false;
            }
        }
    });
    return canAdd;
};

/**
 * Check if the prescription product has the same id as the one already present in array but different eartype.
 * Can add a prescription product with same id and different eartype
 *
 * @param {Array} prescriptionProducts - product to be added or updated
 * @param {dw.util.Collection<dw.order.ProductLineItem>} prescriptionObj - Prescription object with id and eartype
 * @return {boolean} - If the prescription product can be added to the list of prescription ids
 */
base.checkPrescriptionId = function checkPrescriptionId(prescriptionProducts, prescriptionObj) {
    var canAdd = false;
    prescriptionProducts.forEach(function (obj) {
        if (obj.id === prescriptionObj.id && obj.earType !== prescriptionObj.earType) {
            canAdd = true;
        }
    });
    return canAdd;
};

/**
 * checks if OTCBenefit is applicable and apply
 * @param {dw.util.Collection<dw.order.ProductLineItem>} productLineItem - productLineItem
 */
base.applyPriceAdjustment = function applyPriceAdjustment(productLineItem) {
    var isOTCBenefitApplicable = base.checkOTCBenefit();
    var isBenefitApplicable = base.isBenefitApplicable();
    if (!isBenefitApplicable) {
        session.privacy.OTCStatus = 'benefitNotAvailable';
    }
    if (isOTCBenefitApplicable && isBenefitApplicable) {
        var OTCBenefitRemaining = session.privacy.OTCBenefitRemaining;
        if (OTCBenefitRemaining > 0) {
            var maxAmountDiscount = getDiscountAmount(productLineItem);
            if (session.privacy.OTCDevicesCoverage === 'Yes' && session.privacy.NewPurchasePossible === 'Yes') {
                base.benefitsCalculationsAPIForPLI(productLineItem);
            } else {
                if (maxAmountDiscount > 0) {
                    Transaction.wrap(function () {
                        productLineItem.createPriceAdjustment(productLineItem.UUID + OTC_BENEFIT_ID, new dw.campaign.AmountDiscount(maxAmountDiscount));
                    });
                    session.privacy.OTCBenefitInCart = maxAmountDiscount;
                }
            }
        }
    }
};

/**
 * checks if OTCBenefit is applicable based on session values for OTCBenefitRemaining and OTCDevicesCoverage
 * @return {boolean} - returns true if isOTCBenefitApplicable
 */
base.checkOTCBenefit = function checkOTCBenefit() {
    var customerDetails = JSON.parse(session.privacy.customerDetails);
    if (customerDetails && customerDetails.OTCBenefitRemaining && customerDetails.OTCBenefitRemaining > 0) {
        var OTCBenefitTotal = Number(customerDetails.OTCBenefitRemaining);
        session.privacy.OTCBenefitTotal = OTCBenefitTotal;
        var OTCBenefitRemaining = 0;
        var OTCBenefitInCart = session.privacy.OTCBenefitInCart;
        if (OTCBenefitInCart > 0 && OTCBenefitTotal >= OTCBenefitInCart) {
            OTCBenefitRemaining = OTCBenefitTotal - OTCBenefitInCart;
        } else {
            OTCBenefitRemaining = Number(customerDetails.OTCBenefitRemaining);
        }
        var OTCDevicesCoverage = customerDetails.OTCDevicesCoverage ? customerDetails.OTCDevicesCoverage : '';
        var isOTCBenefitApplicable = false;
        if (OTCBenefitTotal && OTCBenefitTotal > 0 && OTCDevicesCoverage === 'Yes') {
            session.privacy.OTCBenefitRemaining = OTCBenefitRemaining;
            isOTCBenefitApplicable = true;
        } else if (OTCBenefitTotal && OTCBenefitTotal === 0) {
            session.privacy.OTCBenefitRemaining = 0;
            isOTCBenefitApplicable = false;
        } else if (OTCDevicesCoverage !== 'Yes') {
            session.privacy.OTCBenefitRemaining = 0;
            isOTCBenefitApplicable = false;
        }
        return isOTCBenefitApplicable;
    }
    return false;
};


base.isBenefitApplicable = function isBenefitApplicable() {
    var Calendar = require('dw/util/Calendar');
    var today = new Calendar();
    today.add(Calendar.DATE, -2);
    var ordertime = today.time;
    var benefitApplicable = true;
    var orderHistory = customer.getOrderHistory();
    var customerOrders = orderHistory.getOrders(
        'creationDate > {0}',
        'creationDate desc',
        ordertime
    );

    if (customerOrders.count > 0) {
        while (customerOrders.hasNext()) {
            var customerOrder = customerOrders.next();
            if ('isBenefitApplied' in customerOrder.custom && customerOrder.custom.isBenefitApplied) {
                benefitApplicable = false;
                return benefitApplicable;
            }
        }
    }
    return benefitApplicable;
};

base.recalculatePriceAdjustments = function recalculatePriceAdjustments(currentBasket) {
    base.removeLinePriceAdjustments(currentBasket);
    base.addLinePriceAdjustments(currentBasket);
    var isBenefitInCart = base.checkBenefitApplied(currentBasket);
    if (isBenefitInCart && session.privacy.OTCStatus !== 'benefitNotAvailable') {
        session.privacy.OTCStatus = 'benefitApplied';
    }
    if (!isBenefitInCart && session.privacy.OTCStatus !== 'benefitNotAvailable') {
        session.privacy.OTCStatus = 'benefitNotApplied';
    }
};

base.removeLinePriceAdjustments = function removeLinePriceAdjustments(currentBasket) {
    collections.forEach(currentBasket.productLineItems, function (productLineItem) {
        if (productLineItem.priceAdjustments) {
            var adjustments = productLineItem.priceAdjustments;
            if (!adjustments.isEmpty()) {
                var adjustment = adjustments.iterator().next();
                Transaction.wrap(function () {
                    productLineItem.removePriceAdjustment(adjustment);
                });
            }
        }
    });
    session.privacy.OTCBenefitInCart = 0;
};

base.addLinePriceAdjustments = function addLinePriceAdjustments(currentBasket) {
    var basket = currentBasket;
    collections.forEach(basket.productLineItems, function (productLineItem) {
        if (productLineItem.product.custom.isOTCProduct) {
            base.applyPriceAdjustment(productLineItem);
            var priceAdjustment = productLineItem.getPriceAdjustmentByPromotionID(productLineItem.UUID + OTC_BENEFIT_ID);
            if (priceAdjustment) {
                Transaction.wrap(function () {
                    basket.custom.isBenefitApplied = true;
                });
            }
        }
    });
};

base.checkBenefitApplied = function checkBenefitApplied(currentBasket) {
    var benefit = false;
    if (currentBasket) {
        collections.forEach(currentBasket.productLineItems, function (productLineItem) {
            var adjustments = productLineItem.priceAdjustments;
            if (!adjustments.isEmpty() && session.privacy.OTCStatus !== 'benefitNotAvailable') {
                benefit = true;
            }
        });
    }
    return benefit;
};

base.benefitsCalculationsAPI = function benefitsCalculationsAPI(items) {
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();
    base.removeLinePriceAdjustments(currentBasket);
    var benefitsCalculationsAPI = require('*/cartridge/scripts/services/BenefitsCalculationsAPI');
    var Logger = require('dw/system/Logger');
    var benefitCalculationAPPID = session.privacy.opportunityId;
    var products = [];
    var benefitsCalculationsAPIRequestObj = {};
    var ProductMgr = require('dw/catalog/ProductMgr');
    for (var i = 0, ii = items.length; i < ii; i++) {
        var item = items[i];
        var product = ProductMgr.getProduct(item.id);
        products.push({
            productId: product && !product.isMaster() && product.isVariant() ? product.getMasterProduct().ID : product.ID,
            quantity: item.quantity
        });
    }
    benefitsCalculationsAPIRequestObj.oppId = benefitCalculationAPPID;
    benefitsCalculationsAPIRequestObj.products = products;
    var benefitsCalculationsAPIRespObj = benefitsCalculationsAPI.call(benefitsCalculationsAPIRequestObj, false);
    if (benefitsCalculationsAPIRespObj.error === 401) {
        benefitsCalculationsAPIRespObj = benefitsCalculationsAPI.call(benefitsCalculationsAPIRequestObj, true);
    }
    if (benefitsCalculationsAPIRespObj.status === 'OK') {
        session.privacy.isBenefitsApiCallSuccessful = true;
        benefitsCalculationsAPIRespObj = benefitsCalculationsAPIRespObj.object ? benefitsCalculationsAPIRespObj.object : benefitsCalculationsAPIRespObj.object;
    } else {
        session.privacy.isBenefitsApiCallSuccessful = false;
    }
    Logger.debug('benefits Calculations API API {0}', JSON.stringify(benefitsCalculationsAPIRespObj));

    var Transaction = require('dw/system/Transaction');
    session.privacy.benefitAppliedToCart = false;
    if (benefitsCalculationsAPIRespObj && 'calculationDetails' in benefitsCalculationsAPIRespObj && benefitsCalculationsAPIRespObj.calculationDetails && benefitsCalculationsAPIRespObj.calculationDetails.length > 0) {
        if (benefitsCalculationsAPIRespObj && 'planBenefit' in benefitsCalculationsAPIRespObj && benefitsCalculationsAPIRespObj.planBenefit > 0) {
            session.privacy.benefitAppliedToCart = true;
        }
        for (var z = 0, z1 = benefitsCalculationsAPIRespObj.calculationDetails.length; z < z1; z++) {
            var benefitProd = benefitsCalculationsAPIRespObj.calculationDetails[z];
            var getVariants = ProductMgr.getProduct(benefitProd.productId).variants;
            for (var k = 0, k1 = getVariants.length; k < k1; k++) {
                var vID = getVariants[k].ID;
                if (currentBasket && currentBasket.getProductLineItems(vID).length > 0) {
                    Transaction.wrap(function () {
                        currentBasket.getProductLineItems(vID)[0].createPriceAdjustment('benefitCalc', new dw.campaign.AmountDiscount(100));
                    });
                    break;
                };

            }
        }
    }

    return benefitsCalculationsAPIRespObj;
};

base.benefitsCalculationsAPIForPLI = function benefitsCalculationsAPIForPLI(item) {
    var benefitsCalculationsAPI = require('*/cartridge/scripts/services/BenefitsCalculationsAPI');
    var Logger = require('dw/system/Logger');
    var benefitCalculationAPPID = session.privacy.opportunityId;
    var products = [];
    var benefitsCalculationsAPIRequestObj = {};
    var ProductMgr = require('dw/catalog/ProductMgr');
    var product = ProductMgr.getProduct(item.productID);
    products.push({
        productId: product && !product.isMaster() && product.isVariant() ? product.getMasterProduct().ID : product.ID,
        quantity: item.quantityValue
    });
    benefitsCalculationsAPIRequestObj.oppId = benefitCalculationAPPID;
    benefitsCalculationsAPIRequestObj.products = products;
    var benefitsCalculationsAPIRespObj = benefitsCalculationsAPI.call(benefitsCalculationsAPIRequestObj, false);
    if (benefitsCalculationsAPIRespObj.error === 401) {
        benefitsCalculationsAPIRespObj = benefitsCalculationsAPI.call(benefitsCalculationsAPIRequestObj, true);
    }
    if (benefitsCalculationsAPIRespObj.status === 'OK') {
        benefitsCalculationsAPIRespObj = benefitsCalculationsAPIRespObj.object.calculationDetails ? benefitsCalculationsAPIRespObj.object.calculationDetails : benefitsCalculationsAPIRespObj.object;
    }
    Logger.debug('benefits Calculations API API {0}', JSON.stringify(benefitsCalculationsAPIRespObj));

    var Transaction = require('dw/system/Transaction');
    for (var z = 0, z1 = benefitsCalculationsAPIRespObj.length; z < z1; z++) {
        var benefitProd = benefitsCalculationsAPIRespObj[z];
        Transaction.wrap(function () {
            item.createPriceAdjustment('benefitCalc', new dw.campaign.AmountDiscount(benefitProd.productOOPAmount));
        });
        break;
    }
    return;
};

module.exports = base;
