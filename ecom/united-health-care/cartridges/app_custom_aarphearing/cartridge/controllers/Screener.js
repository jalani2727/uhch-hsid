'use strict';

/**
 * @namespace Screener
 */
var Site = require('dw/system/Site');
var currentSiteID = Site.current.ID;
var currentSitePipeline = 'Sites-' + currentSiteID + '-Site';

var server = require('server');


server.get(
    'IncludeHearingScreener',
    function (req, res, next) {
        res.render('hearingScreener/questionnaire');
        next();
    }
);
module.exports = server.exports();