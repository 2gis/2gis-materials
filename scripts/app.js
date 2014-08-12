
var cities;

var materials = {
    'Дерево': { color: '#00FF35' },
    'Кирпич': { color: '#008FFF' },
    'Панель': { color: '#FFEE00' },
    'Бетон': { color: '#FF0000' },
    'Металл': { color: '#C000FF' }
};

var heatmapLayerConf = {
    // radius should be small ONLY if scaleRadius is true (or small radius is intended)
    // if scaleRadius is false it will be the constant radius used in pixels
    radius: 0.0006,

    maxOpacity: 0.7,

    // scales the radius based on map zoom
    scaleRadius: true,

    blur: 0.7,

    // if set to false the heatmap uses the global maximum for colorization
    // if activated: uses the data maximum within the current map boundaries
    //   (there will always be a red spot with useLocalExtremas true)
    useLocalExtrema: true,

    latField: 'lat',
    lngField: 'lng',
    valueField: 'count'
};

var map;
var heatmapLayers;

var sbCity;
var bMaterials;
var blMaterialOptions;
var bColorLegend;

function loadMaterialData(cityData, callback, options) {
    cityData.loadingMaterialData = true;

    return jsonp(
        'data/cities/materials/' + cityData.transliteratedName + '.jsonp',
        function(materialData) {
            cityData.loadingMaterialData = false;
            cityData.materialData = materialData;

            update();
        },
        createObject({ callbackName: '_setData' }, options)
    );
}

function update() {
    var transliteratedCityName = sbCity.value;

    if (!cities.hasOwnProperty(transliteratedCityName)) {
        return;
    }

    var cityData = cities[transliteratedCityName];

    if (cityData.materialData === undefined || cityData.loadingMaterialData) {
        return;
    }

    Object.keys(cityData.materialData).forEach(function(materialName) {
        if (!materials.hasOwnProperty(materialName)) {
            return;
        }

        if (!blMaterialOptions[materialName].checked) {
            map.removeLayer(heatmapLayers[materialName]);
            return;
        }

        map.addLayer(heatmapLayers[materialName]);

        var heatmapLayerData = Object.keys(cityData.materialData[materialName]).map(function(id) {
            var item = this[id];

            return {
                lat: +item[1],
                lng: +item[0],
                count: 1
            };
        }, cityData.materialData[materialName]);

        heatmapLayers[materialName].setData({
            max: 8,
            data: heatmapLayerData
        });
    });
}

DG.then(function() {
    map = DG.map('map', {
        'center': [54.98, 82.89],
        'zoom': 13
    });

    addScript('node_modules/heatmap.js/build/heatmap.js', function() {
        addScript('node_modules/heatmap.js/plugins/leaflet-heatmap.js', function() {
            heatmapLayers = Object.keys(materials).reduce(function(heatmapLayers, materialName) {
                heatmapLayers[materialName] = new HeatmapOverlay(
                    createObject(heatmapLayerConf, {
                        gradient: {
                            0: 'rgba(0,0,0,0)',
                            1: materials[materialName].color
                        }
                    })
                );

                return heatmapLayers;
            }, {});

            jsonp('data/cities/index.jsonp', function(cities_) {
                cities = cities_.reduce(function(cities, cityData) {
                    cities[cityData.transliteratedName] = cityData;
                    return cities;
                }, {});

                sbCity = document.getElementById('sbCity');

                Object.keys(cities).forEach(function(cityTransliteratedName) {
                    var cityData = cities[cityTransliteratedName];

                    this[this.length] = new Option(cityData.name, cityData.transliteratedName);

                    if (cityData.name == 'Новосибирск') {
                        sbCity.selectedIndex = this.length - 1;

                        loadMaterialData(cityData);
                    }
                }, sbCity.options);

                bMaterials = document.getElementById('bMaterials');
                bColorLegend = document.getElementById('bColorLegend');

                blMaterialOptions = Object.keys(materials).reduce(function(blMaterialOptions, materialName) {
                    var label = createElementFromHTML(
                        '<label><input type="checkbox" checked="checked" /> ' + materialName + '</label>'
                    );

                    blMaterialOptions[materialName] = label.firstChild;

                    bMaterials.appendChild(label);

                    bColorLegend.insertAdjacentHTML(
                        'beforeend',
                        '<dt><span style="background-color: ' + materials[materialName].color + ';"></span></dt><dd>' +
                            materialName + '</dd>'
                    );

                    return blMaterialOptions;
                }, {});

                sbCity.onchange = function() {
                    var transliteratedCityName = sbCity.value;

                    if (!cities.hasOwnProperty(transliteratedCityName)) {
                        return;
                    }

                    var cityData = cities[transliteratedCityName];

                    if (cityData.materialData === undefined) {
                        loadMaterialData(cityData);
                    } else {
                        update();
                    }
                };

                Object.keys(blMaterialOptions).forEach(function(materialName) {
                    blMaterialOptions[materialName].onchange = function() {
                        update();
                    };
                });
            }, { callbackName: '_setData' });
        });
    });
});
