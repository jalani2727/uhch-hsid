'use strict';

var base = module.superModule;
var Resource = require('dw/web/Resource');
var URLUtils = require('dw/web/URLUtils');

base.checkNonRMA = false;

/*
This object holds the vlue of units of time in ms
e.g. a day is 86400000ms
months = days * 31
*/
var filterUnits = {
    days: 86400000,
    weeks: 604800000,
    months: 2678400000,
    years: 31556952000
};

/*
these filters represent the options used to filter orders
the top one will be picked as the default
*/
var currentDate = new Date();
var year = currentDate.getFullYear();
base.filters = [
    {
        displayValue: 'All',
        optionValue: URLUtils.https('Order-Filtered', 'filterUnit', 'all').abs().toString(),
        units: filterUnits.years,
        filterName: 'all',
        multiplier: 0
    },
    {
        displayValue: Resource.msg('filter.order.history.30days', 'account', null),
        optionValue: URLUtils.https('Order-Filtered', 'filterUnit', 'days', 'filterValue', 30).abs().toString(),
        units: filterUnits.days,
        filterName: 'days',
        multiplier: 30
    },
    {
        displayValue: Resource.msg('filter.order.history.60days', 'account', null),
        optionValue: URLUtils.https('Order-Filtered', 'filterUnit', 'days', 'filterValue', 60).abs().toString(),
        units: filterUnits.days,
        filterName: 'days',
        multiplier: 60
    },
    {
        displayValue: Resource.msg('filter.order.history.last.12months', 'account', null),
        optionValue: URLUtils.https('Order-Filtered', 'filterYear', year).abs().toString(),
        units: 0,
        filterName: 'year',
        multiplier: year
    }
];

var orderItemSummaries = 'SELECT+OrderItemSummary.Id,' +
                                'OrderItemSummary.ProductCode,' +
                                'OrderItemSummary.OrderDeliveryGroupSummaryId,' +
                                'OrderItemSummary.Quantity,' +
                                'OrderItemSummary.QuantityAvailableToFulfill,' +
                                'OrderItemSummary.QuantityAvailableToReturn,' +
                                'OrderItemSummary.QuantityAvailableToCancel,' +
                                'OrderItemSummary.QuantityOrdered,' +
                                'OrderItemSummary.QuantityCanceled,' +
                                'OrderItemSummary.QuantityReturned,' +
                                'OrderItemSummary.TotalPrice,' +
                                'OrderItemSummary.UnitPrice,' +
                                'OrderItemSummary.TotalTaxAmount,' +
                                'OrderItemSummary.Type,' +
                                'OrderItemSummary.TypeCode,' +
                                'OriginalOrderItem.TotalAmtWithTax,' +
                                'OriginalOrderItem.UnitPrice,' +
                                'OriginalOrderItem.TotalTaxAmount,' +
                                'OriginalOrderItem.Quantity,' +
                                'OrderItemSummary.TotalLineAdjustmentAmount,' +
                                'OrderItemSummary.TotalLineAdjustmentAmtWithTax + ' +
                                'FROM+OrderItemSummaries';

base.orderHistoryQuery.orderItemSummaries = orderItemSummaries;
module.exports = base;
