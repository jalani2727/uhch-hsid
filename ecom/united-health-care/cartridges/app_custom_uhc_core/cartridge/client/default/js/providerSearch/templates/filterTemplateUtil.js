'use strict';

var LABELS = require('../utils/labelsUtil').LABELS;

/**
 * Generates <option> tags for brands array
 * @param {Array} brands Brands list
 * @returns {string} HTML string
 */
function generateBrandsOptionsTemplate(brands) {
    return brands
    .map(function (brand) {
        return `<option value="${brand}">${brand}</option>`;
    })
    .join('');
}

/**
 * Generates <option> tags for providers array
 * @param {Array} providers Providers list
 * @returns {string} HTML string
 */
function generateProviderTypeOptionsTemplate(providers) {
    return providers
    .map(function (provider) {
        return `<option value="${provider}">${provider}</option>`;
    })
    .join('');
}

/**
 * Generates HTML template for brands and providers dropdowns
 * @param {Array} brands brands list
 * @param {Array} providers Providers list
 * @returns {string} HTML string
 */
function getFiltersTemplate(brands, providers) {
    var brandsOptionsHTML = generateBrandsOptionsTemplate(brands);
    var providersOptionsHTML = generateProviderTypeOptionsTemplate(providers);

    return `
        <div class="col-12 col-lg-6 col-md-6 form-group filter-by-brand-wrapper">
            <label for="brand-filter" class="form-control-label">${LABELS.FILTER_BY_BRAND}</label>
            <select id="brand-filter" class="form-control custom-select">
                <option value="">${LABELS.SELECT}</option>
                ${brandsOptionsHTML}
            </select>
        </div>

        <div class="col-12 col-lg-6 col-md-6 form-group filter-by-provider-wrapper">
            <label for="provider-filter" class="form-control-label">${LABELS.FILTER_BY_PROVIDER}</label>
            <select id="provider-filter" class="form-control custom-select">
                <option value="">${LABELS.SELECT}</option>
                ${providersOptionsHTML}
            </select>
        </div>
    `;
}

module.exports = {
    getFiltersTemplate: getFiltersTemplate
};
