'use strict';

// API Includes
var Logger = require('dw/system/Logger'); var Status = require('dw/system/Status');

function execute() { //eslint-disable-line
	try {
		var CustomerMgr = require('dw/customer/CustomerMgr');
		var Transaction = require("dw/system/Transaction");
		var OrderMgr = require('dw/order/OrderMgr');

		CustomerMgr.processProfiles(function (profile) {
			if (!profile.custom.linkedLegacyOrders) {
				var query = 'customerEmail = {0}';
				var customerOrders = OrderMgr.searchOrders(query, 'orderNo ASC', profile.email);
				var customer = CustomerMgr.getCustomerByCustomerNumber(
					profile.customerNo
				);
				while (customerOrders.hasNext()) {
					var customerOrder = customerOrders.next();
					Transaction.wrap(function () {
						customerOrder.setCustomer(customer);
					});
				};
				Transaction.wrap(function () {
					profile.custom.linkedLegacyOrders = true;
				});
			}
		}, '');
		return new Status(Status.OK, 'OK');
	} catch (e) {
		Logger.error('Order update failed: ' + e.message);
		return new Status(Status.ERROR, 'ERROR');
	}
}

exports.execute = execute;
