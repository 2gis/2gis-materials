
var Rift = require('../scripts/Rift/Rift');

var tmpl = require('./MaterialsApp.hbs');

/**
 * @param {string} hex
 * @return {Array{ 0:int; 1:int; 2:int; }}
 */
function hexToRGB(hex) {
    if (hex.charAt(0) == '#') {
        hex = hex.slice(1);
    }

    if (hex.length == 3) {
        hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
    }

    return [
        Number('0x' + hex.slice(0, 2)),
        Number('0x' + hex.slice(2, 4)),
        Number('0x' + hex.slice(4))
    ];
}

/**
 * @param {string} url
 * @param {Function} callback
 */
function addScript(url, callback) {
    var script = document.createElement('script');

    script.src = url;
    script.async = true;

    script.onload = script.onerror = function(evt) {
        script.onload = script.onerror = null;

        setTimeout(function() {
            callback(evt.type == 'load');
        }, 1);
    };

    (document.head || document.documentElement).appendChild(script);
}

var materials = {
    'Дерево': { color: '#b47e4d', enName: 'wood' },
    'Кирпич': { color: '#ff6464', enName: 'brick' },
    'Панель': { color: '#008965', enName: 'panel' },
    'Бетон': { color: '#a04089', enName: 'concrete' },
    'Металл': { color: '#0088ff', enName: 'metal' }
};

var heatmapLayerConf = {
    // radius should be small ONLY if scaleRadius is true (or small radius is intended)
    // if scaleRadius is false it will be the constant radius used in pixels
    radius: 0.0005,

    maxOpacity: 0.7,

    // scales the radius based on map zoom
    scaleRadius: true,

    blur: 1.0,

    // if set to false the heatmap uses the global maximum for colorization
    // if activated: uses the data maximum within the current map boundaries
    // (there will always be a red spot with useLocalExtremas true)
    useLocalExtrema: true,

    latField: 'lat',
    lngField: 'lng',
    valueField: 'count'
};

var MaterialsApp = Rift.createClass(Rift.Emitter, {
    __name: 'MaterialsApp',

    _cities: null,
    _selectedCityTransliteratedName: null,

    _urlMap: null,

    _materialDataLoadingEmitter: null,

    _cityListIsShown: false,

    _map: null,

    _heatmapLayers: null,

    element: null,
    _bMap: null,
    _bControlPanel: null,
    _tfCity: null,
    _bMaterials: null,
    _bcMaterialOptions: null,
    _bCityList: null,
    _bcCityListLinks: null,
    _btnReadMore: null,

    _init: function() {
        Rift.object.bindListeners(this);

        this.element = document.body;
        this.element.insertAdjacentHTML('beforeend', tmpl(this));

        this._findBlocks();

        DG.then(function() {
            this._loadScripts(function() {
                this._createHeatmapLayers();

                Rift.ajax.jsonp('MaterialsApp/data/cities/index.jsonp', function(cities) {
                    var urlMap = this._urlMap = Object.create(null);

                    this._cities = cities.reduce(function(cities, cityData) {
                        var transliteratedCityName = cityData.transliteratedName;

                        urlMap[transliteratedCityName.toLowerCase()] = transliteratedCityName;
                        urlMap[cityData.urlName.toLowerCase()] = transliteratedCityName;

                        if (cityData.shortURLName) {
                            urlMap[cityData.shortURLName.toLowerCase()] = transliteratedCityName;
                        }

                        cities[transliteratedCityName] = cityData;
                        return cities;
                    }, {});

                    var transliteratedCityName = urlMap[location.hash.slice(1).toLowerCase()] || 'Moscow';

                    this._map = DG.map(this._bMap, {
                        center: this._cities[transliteratedCityName].coords,
                        zoom: 12,
                        minZoom: 10,
                        maxZoom: 15
                    });

                    this._initTFCityAndBCityList(transliteratedCityName);
                    this._initBMaterials();
                    this._bindListeners();
                    this._loadMaterialData(this._selectedCityTransliteratedName, function() {
                        this._updateBMaterials();
                        this._updateHeatmapLayers();

                        try {
                            Ya.share({ element: '.footer' });
                        } catch (err) {
                            //
                        }
                    });
                }.bind(this), { callbackName: '_setCitiesIndex', timeout: 120000 });
            });
        }.bind(this));
    },

    _findBlocks: function() {
        var el = this.element;

        this._bMap = el.querySelector('[data-name=bMap]');
        this._bControlPanel = el.querySelector('[data-name=bControlPanel]');
        this._tfCity = el.querySelector('[data-name=tfCity]');
        this._bMaterials = el.querySelector('[data-name=bMaterials]');
        this._bCityList = el.querySelector('[data-name=bCityList]');
        this._btnReadMore = el.querySelector('[data-name=btnReadMore]');
    },

    /**
     * @param {Function} callback
     */
    _loadScripts: function(callback) {
        addScript('public/heatmap.min.js', function() {
            callback.call(this);
        }.bind(this));
    },

    _createHeatmapLayers: function() {
        this._heatmapLayers = Object.keys(materials).reduce(function(heatmapLayers, materialName) {
            var color = materials[materialName].color;

            heatmapLayers[materialName] = new HeatmapOverlay(
                Object.assign(Object.create(heatmapLayerConf), {
                    gradient: {
                        0: Rift.string.format('rgba(%1, %2, %3, 0)', hexToRGB(color)),
                        1: color
                    }
                })
            );

            return heatmapLayers;
        }, {});
    },

    /**
     * @param {string} [selectedCityTransliteratedName]
     */
    _initTFCityAndBCityList: function(selectedCityTransliteratedName) {
        var cities = this._cities;

        var bCityList = this._bCityList;
        var bcCityListLinks = this._bcCityListLinks = {};

        Object.keys(cities).forEach(function(cityTransliteratedName) {
            var cityData = cities[cityTransliteratedName];

            var link = Rift.dom.createElementFromHTML(
                '<a data-transliterated-name="%1" href="#%2">%3</a>',
                cityTransliteratedName,
                cityData.urlName,
                cityData.name
            );

            var li = Rift.dom.createElement('li', null, [link]);

            bcCityListLinks[cityTransliteratedName] = link;
            bCityList.appendChild(li);
        });

        if (selectedCityTransliteratedName) {
            this._setCityInControlPanel(selectedCityTransliteratedName);
        }
    },

    /**
     * @param {string} transliteratedCityName
     */
    _setCityInControlPanel: function(transliteratedCityName) {
        var cityData = this._cities[transliteratedCityName];

        if (this._selectedCityTransliteratedName) {
            this._tfCity.classList.remove('_city-' + this._selectedCityTransliteratedName);
            this._bcCityListLinks[this._selectedCityTransliteratedName].classList.remove('_selected');
        }

        this._selectedCityTransliteratedName = transliteratedCityName;

        this._tfCity.classList.add('_city-' + transliteratedCityName);
        this._tfCity.lastElementChild.innerHTML = cityData.name;
        this._bcCityListLinks[transliteratedCityName].classList.add('_selected');
    },

    _initBMaterials: function() {
        var bMaterials = this._bMaterials;

        this._bcMaterialOptions = Object.keys(materials).reduce(function(bcMaterialOptions, materialName) {
            var label = Rift.dom.createElementFromHTML(
                '<label class="chb _material-%1"><input type="checkbox" checked="checked" /><span></span>%2</label>',
                materials[materialName].enName,
                materialName
            );

            bcMaterialOptions[materialName] = label.firstChild;
            bMaterials.appendChild(Rift.dom.createElement('div', null, [label]));

            return bcMaterialOptions;
        }, {});
    },

    _bindListeners: function() {
        this.listenTo(this._tfCity, 'click', this._onTFCityClick);

        this.listenTo(this._bCityList, 'click', this._onBCityListClick);

        Object.keys(this._bcMaterialOptions).forEach(function(materialName) {
            this.listenTo(this._bcMaterialOptions[materialName], 'change', this._onBCMaterialOptionsChange);
        }, this);
    },

    /**
     * @param {MouseEvent} evt
     */
    _onTFCityClick: function(evt) {
        evt.preventDefault();

        this.toogleCityList();
    },

    /**
     * @param {MouseEvent} evt
     */
    _onBCityListClick: function(evt) {
        setTimeout(function() {
            var link;
            var node = evt.target;

            while (node != this._bCityList) {
                if (node.tagName == 'A') {
                    link = node;
                }
                node = node.parentNode;
            }

            if (!link) {
                return;
            }

            var transliteratedCityName = link.getAttribute('data-transliterated-name');
            var cityData = this._cities[transliteratedCityName];

            this._map.panTo(cityData.coords);

            this._setCityInControlPanel(transliteratedCityName);

            function update() {
                this._updateBMaterials();
                this._updateHeatmapLayers();
            }

            if (cityData.materialData === undefined) {
                this._loadMaterialData(transliteratedCityName, update);
            } else {
                update.call(this);
            }

            this.hideCityList();
        }.bind(this), 1);
    },

    _onBCMaterialOptionsChange: function() {
        setTimeout(function() {
            this._updateHeatmapLayers();
        }.bind(this), 1);
    },

    /**
     * @param {string} transliteratedCityName
     * @param {Function} callback
     */
    _loadMaterialData: function(transliteratedCityName, callback) {
        var cityData = this._cities[transliteratedCityName];

        if (cityData.materialData) {
            callback.call(this);
            return;
        }

        var loadingEmitter = this._materialDataLoadingEmitter ||
            (this._materialDataLoadingEmitter = new Rift.Emitter());

        loadingEmitter.once('loaded:' + transliteratedCityName, callback, this);

        if (cityData.loadingMaterialData) {
            return;
        }

        this._bControlPanel.classList.add('_loading');

        cityData.loadingMaterialData = true;

        Rift.ajax.jsonp(
            'MaterialsApp/data/cities/materials/' + transliteratedCityName + '.jsonp',
            function(materialData) {
                this._bControlPanel.classList.remove('_loading');

                cityData.loadingMaterialData = false;
                cityData.materialData = materialData;

                loadingEmitter.emit('loaded:' + transliteratedCityName);
            }.bind(this),
            { callbackName: '_setCityMaterials', timeout: 120000 }
        );
    },

    _updateBMaterials: function() {
        var cityData = this._cities[this._selectedCityTransliteratedName];

        if (cityData.materialData === undefined || cityData.loadingMaterialData) {
            return;
        }

        var counts = {};
        var sum = 0;

        Object.keys(cityData.materialData).forEach(function(materialName) {
            if (!materials.hasOwnProperty(materialName)) {
                return;
            }

            var count = Object.keys(cityData.materialData[materialName]).length;

            counts[materialName] = count;
            sum += count;
        });

        Object.keys(counts).forEach(function(materialName) {
            var percent = (counts[materialName] / sum * 100).toFixed(2) + '%';
            this._bcMaterialOptions[materialName].parentNode.setAttribute('data-percent', percent);
        }, this);
    },

    _updateHeatmapLayers: function() {
        var cityData = this._cities[this._selectedCityTransliteratedName];

        if (cityData.materialData === undefined || cityData.loadingMaterialData) {
            return;
        }

        var heatmapLayers = this._heatmapLayers;

        Object.keys(cityData.materialData).forEach(function(materialName) {
            if (!materials.hasOwnProperty(materialName)) {
                return;
            }

            if (!this._bcMaterialOptions[materialName].checked) {
                this._map.removeLayer(heatmapLayers[materialName]);
                return;
            }

            this._map.addLayer(heatmapLayers[materialName]);

            var heatmapLayerData = cityData.materialData[materialName].map(function(item) {
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
        }, this);
    },

    /**
     * @returns {boolean}
     */
    showCityList: function() {
        if (this._cityListIsShown) {
            return false;
        }

        this._cityListIsShown = true;
        this.element.classList.add('_cityList');
        this._bControlPanel.classList.add('_cityList');

        return true;
    },

    /**
     * @returns {boolean}
     */
    hideCityList: function() {
        if (!this._cityListIsShown) {
            return false;
        }

        this._cityListIsShown = false;
        this.element.classList.remove('_cityList');
        this._bControlPanel.classList.remove('_cityList');

        return true;
    },

    /**
     * @param {boolean} [stateValue]
     * @returns {boolean}
     */
    toogleCityList: function(stateValue) {
        if (stateValue === undefined) {
            stateValue = !this._cityListIsShown;
        }

        if (stateValue) {
            this.showCityList();
        } else {
            this.hideCityList();
        }

        return stateValue;
    },

    destroy: function() {
        this.stopListening();
    }
});

window.materialsApp = new MaterialsApp();
