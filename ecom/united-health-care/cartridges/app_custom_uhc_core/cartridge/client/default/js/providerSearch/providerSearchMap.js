'use strict';

var providerSearchUtil = require('./common');
var data = require('./data');
var practices = data.practices;

var map;
var mapEl;
var markers;
var preferredPracticeMarker;
var standardPracticeMarker;

/**
 * Sets markers on map object
 * @param {Object} _map Map object
 */
function setMapOnAll(_map) {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(_map);
    }
}

/**
 * Hides markers on map
 */
function hideMarkers() {
    setMapOnAll(null);
}

/**
 * Shows markers on the map
 */
function showMarkers() {
    setMapOnAll(map);
}

/**
* Deletes markers and clears out markers array
*/
function deleteMarkers() {
    hideMarkers();
    markers = [];
}

/**
* Create html content for marker popup
* @param {Object} practice practice object
* @returns {string} HTML string
*/
function getInfoContent(practice) {
    // Adding inside styles, since the map loads in iframe
    return `
        <div class="maps-info-popup" style="margin: 10px; max-width: 200px;">
            <h5 class="practice-name">${practice.practiceName}</h5>
            <p class="practice-address">${practice.address}</p>
        </div>
    `;
}

/**
 * Generates markers on the map
 * @param {Array} filteredPractices array of filtered practices
 * @param {boolean} enableMarkersClick conditionally attached event handler on marker click
 */
function createMarkers(filteredPractices, enableMarkersClick) {
    markers = [];
    var infowindow = new google.maps.InfoWindow();
    var bounds = new google.maps.LatLngBounds();

    (filteredPractices || practices).forEach(function (practice) {
        var isPreferredProvider = providerSearchUtil.isPreferredProvider(practice);
        var markerIcon = isPreferredProvider ? preferredPracticeMarker : standardPracticeMarker;
        var location = new google.maps.LatLng(practice.latitude, practice.longitude);
        var marker = new google.maps.Marker({
            position: location,
            icon: markerIcon,
            draggable: false,
            map: map,
            title: practice.practiceName
        });

        var practicePopupContent = getInfoContent(practice);
        if (enableMarkersClick) {
            marker.addListener('click', function () {
                infowindow.setOptions({
                    content: practicePopupContent
                });
                infowindow.open(map, marker);
            });
        }

        bounds.extend(marker.position);

        markers.push(marker);
    });

    var zoomChangeBoundsListener = google.maps.event.addListener(map, 'bounds_changed', () => {
        google.maps.event.removeListener(zoomChangeBoundsListener);
        map.setZoom(Math.min(13, map.getZoom()));
    });

    if (markers.length) {
        map.fitBounds(bounds);
    }
}

/**
 * Create map object and display on page
 */
function initMap() {
    mapEl = document.getElementById('map');
    if (!mapEl) return;

    var latlng = new google.maps.LatLng(37.09024, -95.712891);
    map = new google.maps.Map(mapEl, {
        zoom: 4,
        center: latlng,
        zoomControl: true,
        zoomControlOptions: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false
    });

    preferredPracticeMarker = new google.maps.MarkerImage(
        providerSearchUtil.getPreferredProviderMarkerIconUrl(),
        null,
        null,
        null,
        new google.maps.Size(64, 64)
      );

    standardPracticeMarker = new google.maps.MarkerImage(
        providerSearchUtil.getStandardProviderMarkerIconUrl(),
        null,
        null,
        null,
        new google.maps.Size(64, 64)
      );

    var enableMarkersClick = mapEl.dataset.customerType === 'registered';
    createMarkers(null, enableMarkersClick);
    setMapOnAll(map);
}

/**
 * Updates markers on the map based on practices filtered data
 * @param {Array} filteredPractices Practices array
 */
function updateMarkers(filteredPractices) {
    if (!mapEl) return;
    deleteMarkers();
    var enableMarkersClick = mapEl.dataset.customerType === 'registered';
    createMarkers(filteredPractices, enableMarkersClick);
    showMarkers(map);
}

window.initMap = initMap;

module.exports = {
    updateMarkers: updateMarkers
};

