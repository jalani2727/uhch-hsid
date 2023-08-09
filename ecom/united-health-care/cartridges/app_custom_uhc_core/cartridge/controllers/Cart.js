'use strict';

var server = require('server');
server.extend(module.superModule);
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');

/**
 * Cart-UpdateQuantity : The Cart-UpdateQuantity endpoint handles updating the quantity of a product line item in the basket
 * Replaced this to be applicable for DefaultInStock flag at inventory level
 * @name Base/Cart-UpdateQuantity
 * @function
 * @memberof Cart
 * @param {querystringparameter} - pid - the product id
 * @param {querystringparameter} - quantity - the quantity to be updated for the line item
 * @param {querystringparameter} -  uuid - the universally unique identifier of the product object
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - get
 */
server.replace('UpdateQuantity', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Resource = require('dw/web/Resource');
    var Transaction = require('dw/system/Transaction');
    var URLUtils = require('dw/web/URLUtils');
    var CartModel = require('*/cartridge/models/cart');
    var collections = require('*/cartridge/scripts/util/collections');
    var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var inventoryHelpers = require('*/cartridge/scripts/helpers/inventoryHelpers');

    var currentBasket = BasketMgr.getCurrentBasket();

    if (!currentBasket) {
        res.setStatusCode(500);
        res.json({
            error: true,
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });

        return next();
    }

    var productId = req.querystring.pid;
    var updateQuantity = parseInt(req.querystring.quantity, 10);
    var uuid = req.querystring.uuid;
    var productLineItems = currentBasket.productLineItems;
    var matchingLineItem = collections.find(productLineItems, function (item) {
        return item.productID === productId && item.UUID === uuid;
    });

    var totalQtyRequested = 0;
    var qtyAlreadyInCart = 0;
    var minOrderQuantity = 0;
    var canBeUpdated = false;
    var bundleItems;
    var bonusDiscountLineItemCount = currentBasket.bonusDiscountLineItems.length;

    if (matchingLineItem) {
        if (matchingLineItem.product.bundle) {
            bundleItems = matchingLineItem.bundledProductLineItems;
            canBeUpdated = collections.every(bundleItems, function (item) {
                var quantityToUpdate = updateQuantity *
                    matchingLineItem.product.getBundledProductQuantity(item.product).value;
                qtyAlreadyInCart = cartHelper.getQtyAlreadyInCart(
                    item.productID,
                    productLineItems,
                    item.UUID
                );
                totalQtyRequested = quantityToUpdate + qtyAlreadyInCart;
                minOrderQuantity = item.product.minOrderQuantity.value;
                return inventoryHelpers.isAvailableToSell(item.productInventoryListID, item.product.availabilityModel.inventoryRecord, totalQtyRequested) &&
                    (quantityToUpdate >= minOrderQuantity);
            });
        } else {
            qtyAlreadyInCart = cartHelper.getQtyAlreadyInCart(
                productId,
                productLineItems,
                matchingLineItem.UUID
            );
            totalQtyRequested = updateQuantity + qtyAlreadyInCart;
            minOrderQuantity = matchingLineItem.product.minOrderQuantity.value;
            canBeUpdated = inventoryHelpers.isAvailableToSell(matchingLineItem.productInventoryListID, matchingLineItem.product.availabilityModel.inventoryRecord, totalQtyRequested) &&
                (updateQuantity >= minOrderQuantity);
        }
    }

    if (canBeUpdated) {
        Transaction.wrap(function () {
            matchingLineItem.setQuantityValue(updateQuantity);

            var previousBounsDiscountLineItems = collections.map(currentBasket.bonusDiscountLineItems, function (bonusDiscountLineItem) {
                return bonusDiscountLineItem.UUID;
            });
            cartHelper.recalculatePriceAdjustments(currentBasket);

            basketCalculationHelpers.calculateTotals(currentBasket);
            if (currentBasket.bonusDiscountLineItems.length > bonusDiscountLineItemCount) {
                var prevItems = JSON.stringify(previousBounsDiscountLineItems);

                collections.forEach(currentBasket.bonusDiscountLineItems, function (bonusDiscountLineItem) {
                    if (prevItems.indexOf(bonusDiscountLineItem.UUID) < 0) {
                        bonusDiscountLineItem.custom.bonusProductLineItemUUID = matchingLineItem.UUID; // eslint-disable-line no-param-reassign
                        matchingLineItem.custom.bonusProductLineItemUUID = 'bonus';
                        matchingLineItem.custom.preOrderUUID = matchingLineItem.UUID;
                    }
                });
            }
        });
    }

    if (matchingLineItem && canBeUpdated) {
        var basketModel = new CartModel(currentBasket);
        cartHelper.recalculatePriceAdjustments(currentBasket);
        res.json(basketModel);
    } else {
        res.setStatusCode(500);
        res.json({
            errorMessage: Resource.msg('error.cannot.update.product.quantity', 'cart', null)
        });
    }

    return next();
});

/**
 * Cart-EditProductLineItem : The Cart-EditProductLineItem endpoint edits a product line item in the basket on cart page
 * Replaced this to be applicable for DefaultInStock flag at inventory level
 * @name Base/Cart-EditProductLineItem
 * @function
 * @memberof Cart
 * @param {httpparameter} - uuid - UUID of product line item being edited
 * @param {httpparameter} - pid - Product ID
 * @param {httpparameter} - quantity - Quantity
 * @param {httpparameter} - selectedOptionValueId - ID of selected option
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.replace('EditProductLineItem', function (req, res, next) {
    var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');
    var arrayHelper = require('*/cartridge/scripts/util/array');
    var BasketMgr = require('dw/order/BasketMgr');
    var ProductMgr = require('dw/catalog/ProductMgr');
    var Resource = require('dw/web/Resource');
    var URLUtils = require('dw/web/URLUtils');
    var Transaction = require('dw/system/Transaction');
    var CartModel = require('*/cartridge/models/cart');
    var collections = require('*/cartridge/scripts/util/collections');
    var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var inventoryHelpers = require('*/cartridge/scripts/helpers/inventoryHelpers');

    var currentBasket = BasketMgr.getCurrentBasket();

    if (!currentBasket) {
        res.setStatusCode(500);
        res.json({
            error: true,
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return next();
    }

    var uuid = req.form.uuid;
    var productId = req.form.pid;
    var selectedOptionValueId = req.form.selectedOptionValueId;
    var updateQuantity = parseInt(req.form.quantity, 10);

    var productLineItems = currentBasket.allProductLineItems;
    var requestLineItem = collections.find(productLineItems, function (item) {
        return item.UUID === uuid;
    });

    var uuidToBeDeleted = null;
    var pliToBeDeleted;
    var newPidAlreadyExist = collections.find(productLineItems, function (item) {
        if (item.productID === productId && item.UUID !== uuid) {
            uuidToBeDeleted = item.UUID;
            pliToBeDeleted = item;
            updateQuantity += parseInt(item.quantity, 10);
            return true;
        }
        return false;
    });

    var totalQtyRequested = 0;
    var qtyAlreadyInCart = 0;
    var minOrderQuantity = 0;
    var canBeUpdated = false;
    var bundleItems;

    if (requestLineItem) {
        if (requestLineItem.product.bundle) {
            bundleItems = requestLineItem.bundledProductLineItems;
            canBeUpdated = collections.every(bundleItems, function (item) {
                var quantityToUpdate = updateQuantity *
                    requestLineItem.product.getBundledProductQuantity(item.product).value;
                qtyAlreadyInCart = cartHelper.getQtyAlreadyInCart(
                    item.productID,
                    productLineItems,
                    item.UUID
                );
                totalQtyRequested = quantityToUpdate + qtyAlreadyInCart;
                minOrderQuantity = item.product.minOrderQuantity.value;
                return inventoryHelpers.isAvailableToSell(item.productInventoryListID, item.product.availabilityModel.inventoryRecord, totalQtyRequested) &&
                    (quantityToUpdate >= minOrderQuantity);
            });
        } else {
            qtyAlreadyInCart = cartHelper.getQtyAlreadyInCart(
                productId,
                productLineItems,
                requestLineItem.UUID
            );
            totalQtyRequested = updateQuantity + qtyAlreadyInCart;
            minOrderQuantity = requestLineItem.product.minOrderQuantity.value;
            canBeUpdated = inventoryHelpers.isAvailableToSell(requestLineItem.productInventoryListID, requestLineItem.product.availabilityModel.inventoryRecord, totalQtyRequested) &&
                (updateQuantity >= minOrderQuantity);
        }
    }

    var error = false;
    if (canBeUpdated) {
        var product = ProductMgr.getProduct(productId);
        try {
            Transaction.wrap(function () {
                if (newPidAlreadyExist) {
                    var shipmentToRemove = pliToBeDeleted.shipment;
                    currentBasket.removeProductLineItem(pliToBeDeleted);
                    if (shipmentToRemove.productLineItems.empty && !shipmentToRemove.default) {
                        currentBasket.removeShipment(shipmentToRemove);
                    }
                }

                if (!requestLineItem.product.bundle) {
                    requestLineItem.replaceProduct(product);
                }

                // If the product has options
                var optionModel = product.getOptionModel();
                if (optionModel && optionModel.options && optionModel.options.length) {
                    var productOption = optionModel.options.iterator().next();
                    var productOptionValue = optionModel.getOptionValue(productOption, selectedOptionValueId);
                    var optionProductLineItems = requestLineItem.getOptionProductLineItems();
                    var optionProductLineItem = optionProductLineItems.iterator().next();
                    optionProductLineItem.updateOptionValue(productOptionValue);
                }

                requestLineItem.setQuantityValue(updateQuantity);
                basketCalculationHelpers.calculateTotals(currentBasket);
            });
        } catch (e) {
            error = true;
        }
    }

    if (!error && requestLineItem && canBeUpdated) {
        var cartModel = new CartModel(currentBasket);

        var responseObject = {
            cartModel: cartModel,
            newProductId: productId
        };

        if (uuidToBeDeleted) {
            responseObject.uuidToBeDeleted = uuidToBeDeleted;
        }

        var cartItem = arrayHelper.find(cartModel.items, function (item) {
            return item.UUID === uuid;
        });

        var productCardContext = {
            lineItem: cartItem,
            actionUrls: cartModel.actionUrls
        };
        var productCardTemplate = 'cart/productCard/cartProductCardServer.isml';

        responseObject.renderedTemplate = renderTemplateHelper.getRenderedHtml(
            productCardContext,
            productCardTemplate
        );

        res.json(responseObject);
    } else {
        res.setStatusCode(500);
        res.json({
            errorMessage: Resource.msg('error.cannot.update.product', 'cart', null)
        });
    }

    return next();
});

/**
 * Cart-AddProduct : The Cart-MiniCart endpoint is responsible for displaying the cart icon in the header with the number of items in the current basket
 * @name Base/Cart-AddProduct
 * @function
 * @memberof Cart
 * @param {httpparameter} - pid - product ID
 * @param {httpparameter} - quantity - quantity of product
 * @param {httpparameter} - options - list of product options
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.replace('AddProduct', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Resource = require('dw/web/Resource');
    var URLUtils = require('dw/web/URLUtils');
    var ProductMgr = require('dw/catalog/ProductMgr');
    var Transaction = require('dw/system/Transaction');
    var CartModel = require('*/cartridge/models/cart');
    var ProductLineItemsModel = require('*/cartridge/models/productLineItems');
    var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var prescriptionEartype = req.form.earType;
    var currentBasket = BasketMgr.getCurrentOrNewBasket();
    var previousBonusDiscountLineItems = currentBasket.getBonusDiscountLineItems();
    var productId = req.form.pid;
    var childProducts = Object.hasOwnProperty.call(req.form, 'childProducts') ?
        JSON.parse(req.form.childProducts) :
        [];
    var options = req.form.options ? JSON.parse(req.form.options) : [];
    var quantity;
    var result;
    var pidsObj;
    var product = ProductMgr.getProduct(productId);
    var registeredUser = true;

    if (product.custom.isPrescriptionProduct || product.custom.isOTCProduct) {
        // eslint-disable-next-line no-undef
        if (!customer.authenticated) {
            registeredUser = false;
            res.json({
                registeredUser: registeredUser,
                addToCartMessage: Resource.msg('text.alert.addtocart.unauthenticated.user', 'product', null)
            });
            return next();
        }
    }

    if (currentBasket) {
        Transaction.wrap(function () {
            if (!req.form.pidsObj) {
                quantity = parseInt(req.form.quantity || 1, 10);
                result = cartHelper.addProductToCart(
                    currentBasket,
                    productId,
                    quantity,
                    childProducts,
                    options,
                    prescriptionEartype
                );
            } else {
                // product set
                pidsObj = JSON.parse(req.form.pidsObj);
                result = {
                    error: false,
                    message: Resource.msg('text.alert.addedtobasket', 'product', null)
                };

                pidsObj.forEach(function (PIDObj) {
                    quantity = parseInt(PIDObj.qty || 1, 10);
                    var pidOptions = PIDObj.options ? JSON.parse(PIDObj.options) : {};
                    var PIDObjResult = cartHelper.addProductToCart(
                        currentBasket,
                        PIDObj.pid,
                        quantity,
                        childProducts,
                        pidOptions
                    );
                    if (PIDObjResult.error) {
                        result.error = PIDObjResult.error;
                        result.message = PIDObjResult.message;
                    }
                });
            }
            if (!result.error) {
                cartHelper.recalculatePriceAdjustments(currentBasket);
                cartHelper.ensureAllShipmentsHaveMethods(currentBasket);
                basketCalculationHelpers.calculateTotals(currentBasket);
            }
        });
    }

    var quantityTotal = ProductLineItemsModel.getTotalQuantity(currentBasket.productLineItems);
    var cartModel = new CartModel(currentBasket);

    var urlObject = {
        url: URLUtils.url('Cart-ChooseBonusProducts').toString(),
        configureProductstUrl: URLUtils.url('Product-ShowBonusProducts').toString(),
        addToCartUrl: URLUtils.url('Cart-AddBonusProducts').toString()
    };

    var newBonusDiscountLineItem =
        cartHelper.getNewBonusDiscountLineItem(
            currentBasket,
            previousBonusDiscountLineItems,
            urlObject,
            result.uuid
        );
    if (newBonusDiscountLineItem) {
        var allLineItems = currentBasket.allProductLineItems;
        var collections = require('*/cartridge/scripts/util/collections');
        collections.forEach(allLineItems, function (pli) {
            if (pli.UUID === result.uuid) {
                Transaction.wrap(function () {
                    pli.custom.bonusProductLineItemUUID = 'bonus'; // eslint-disable-line no-param-reassign
                    pli.custom.preOrderUUID = pli.UUID; // eslint-disable-line no-param-reassign
                });
            }
        });
    }

    var reportingURL = cartHelper.getReportingUrlAddToCart(currentBasket, result.error);

    res.json({
        reportingURL: reportingURL,
        quantityTotal: quantityTotal,
        message: result.message,
        cart: cartModel,
        newBonusDiscountLineItem: newBonusDiscountLineItem || {},
        error: result.error,
        pliUUID: result.uuid,
        minicartCountOfItems: Resource.msgf('minicart.count', 'common', null, quantityTotal)
    });

    return next();
});

/**
 * Cart-Show : The Cart-Show endpoint renders the cart page with the current basket
 * @name Base/Cart-Show
 * @function
 * @memberof Cart
 * @param {middleware} - server.middleware.https
 * @param {middleware} - consentTracking.consent
 * @param {middleware} - csrfProtection.generateToken
 * @param {category} - sensitive
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.replace(
    'Show',
    server.middleware.https,
    consentTracking.consent,
    csrfProtection.generateToken,
    function (req, res, next) {
        var URLUtils = require('dw/web/URLUtils');
        var BasketMgr = require('dw/order/BasketMgr');
        var Transaction = require('dw/system/Transaction');
        var CartModel = require('*/cartridge/models/cart');
        var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
        var reportingUrlsHelper = require('*/cartridge/scripts/reportingUrls');
        var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
        var Site = require('dw/system/Site');
        var currentSiteID = Site.current.ID;
        var currentSitePipeline = 'Sites-' + currentSiteID + '-Site';
        var preferences = require('*/cartridge/config/preferences.js');
        var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
        if (req.pageMetaData.title === currentSitePipeline) {
            var nameObj = JSON.parse(preferences.pageMetaTitle);
            pageMetaHelper.setPageMetaData(req.pageMetaData, nameObj['Cart-Show']);
        }
        let viewData = res.getViewData();
        var currentBasket = BasketMgr.getCurrentBasket();
        var reportingURLs;
        if (currentBasket && currentBasket.productLineItems.length > 0) {
            viewData.OTCStatusURL = URLUtils.url('Cart-OTCStatusURL').toString();
            Transaction.wrap(function () {
                if (currentBasket.currencyCode !== req.session.currency.currencyCode) {
                    currentBasket.updateCurrency();
                }
                cartHelper.recalculatePriceAdjustments(currentBasket);
                cartHelper.ensureAllShipmentsHaveMethods(currentBasket);
                basketCalculationHelpers.calculateTotals(currentBasket);
            });
        }

        if (currentBasket && currentBasket.allLineItems.length) {
            reportingURLs = reportingUrlsHelper.getBasketOpenReportingURLs(currentBasket);
        }

        res.setViewData({ reportingURLs: reportingURLs });

        var basketModel = new CartModel(currentBasket);
        res.render('cart/cart', basketModel);
        next();
    }, pageMetaData.computedPageMetaData
);

/**
 * Updates the OTCStatus whenever there is any update in the cart.
 */
server.get('OTCStatusURL', function (req, res, next) {
    res.json({
        OTCStatus: session.privacy.OTCStatus
    });
    next();
});

/**
 * Cart-RemoveProductLineItem : The Cart-RemoveProductLineItem endpoint removes a product line item from the basket
 * @name Base/Cart-RemoveProductLineItem
 * @function
 * @memberof Cart
 * @param {querystringparameter} - pid - the product id
 * @param {querystringparameter} - uuid - the universally unique identifier of the product object
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - get
 */
server.replace('RemoveProductLineItem', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Resource = require('dw/web/Resource');
    var Transaction = require('dw/system/Transaction');
    var URLUtils = require('dw/web/URLUtils');
    var CartModel = require('*/cartridge/models/cart');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');

    var currentBasket = BasketMgr.getCurrentBasket();

    if (!currentBasket) {
        res.setStatusCode(500);
        res.json({
            error: true,
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });

        return next();
    }

    var isProductLineItemFound = false;
    var bonusProductsUUIDs = [];

    Transaction.wrap(function () {
        if (req.querystring.pid && req.querystring.uuid) {
            var productLineItems = currentBasket.getAllProductLineItems(req.querystring.pid);
            var bonusProductLineItems = currentBasket.bonusLineItems;
            var mainProdItem;
            for (var i = 0; i < productLineItems.length; i++) {
                var item = productLineItems[i];
                if ((item.UUID === req.querystring.uuid)) {
                    if (bonusProductLineItems && bonusProductLineItems.length > 0) {
                        for (var j = 0; j < bonusProductLineItems.length; j++) {
                            var bonusItem = bonusProductLineItems[j];
                            mainProdItem = bonusItem.getQualifyingProductLineItemForBonusProduct();
                            if (mainProdItem !== null
                                && (mainProdItem.productID === item.productID)) {
                                bonusProductsUUIDs.push(bonusItem.UUID);
                            }
                        }
                    }

                    var shipmentToRemove = item.shipment;
                    currentBasket.removeProductLineItem(item);
                    if (shipmentToRemove.productLineItems.empty && !shipmentToRemove.default) {
                        currentBasket.removeShipment(shipmentToRemove);
                    }
                    isProductLineItemFound = true;
                    break;
                }
            }
        }
        var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
        cartHelper.recalculatePriceAdjustments(currentBasket);
        basketCalculationHelpers.calculateTotals(currentBasket);
    });

    if (isProductLineItemFound) {
        var basketModel = new CartModel(currentBasket);
        var basketModelPlus = {
            basket: basketModel,
            toBeDeletedUUIDs: bonusProductsUUIDs
        };
        res.json(basketModelPlus);
    } else {
        res.setStatusCode(500);
        res.json({ errorMessage: Resource.msg('error.cannot.remove.product', 'cart', null) });
    }

    return next();
});

module.exports = server.exports();
