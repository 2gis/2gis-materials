
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
    //   (there will always be a red spot with useLocalExtremas true)
    useLocalExtrema: true,

    latField: 'lat',
    lngField: 'lng',
    valueField: 'count'
};

window.Rift = Rift;

var MaterialsApp = Rift.createClass(Rift.Emitter, {
    __name: 'MaterialsApp',

    _cities: null,
    _selectedCityTransliteratedName: null,

    _materialDataLoadingEmitter: null,

    _cityListIsShown: false,

    _map: null,

    _heatmapLayers: null,

    element: null,
    _bMap: null,
    _tfCity: null,
    _bMaterials: null,
    _bcMaterialOptions: null,
    _bCityList: null,
    _bcCityListLinks: null,
    _btnReadMore: null,

    _init: function() {
        Rift.proto.bindListeners(this);

        this.element = document.body;
        this.element.insertAdjacentHTML('beforeend', tmpl(this));

        DG.then(function() {
            this._findBlocks();

            this._map = DG.map(this._bMap, {
                'center': [55.026472, 82.921475],
                //'center': [54.98, 82.89],
                'zoom': 12
            });

            this._loadScripts(function() {
                this._createHeatmapLayers();

                Rift.ajax.jsonp('MaterialsApp/data/cities/index.jsonp', function(cities) {
                    this._cities = cities.reduce(function(cities, cityData) {
                        cities[cityData.transliteratedName] = cityData;
                        return cities;
                    }, {});

                    this._updateTFCityAndBCityList('Novosybyrsk');
                    this._updateBMaterials();
                    this._bindListeners();
                    this._loadMaterialData(this._selectedCityTransliteratedName, this._updateHeatmapLayers);
                }.bind(this), { callbackName: '_setCitiesIndex' });
            }.bind(this));
        }.bind(this));
    },

    _findBlocks: function() {
        var el = this.element;

        this._bMap = el.querySelector('[data-name=bMap]');
        this._tfCity = el.querySelector('[data-name=tfCity]');
        this._bMaterials = el.querySelector('[data-name=bMaterials]');
        this._bCityList = el.querySelector('[data-name=bCityList]');
        this._btnReadMore = el.querySelector('[data-name=btnReadMore]');
    },

    /**
     * @param {Function} callback
     */
    _loadScripts: function(callback) {
        addScript('node_modules/heatmap.js/build/heatmap.js', function() {
            addScript('node_modules/heatmap.js/plugins/leaflet-heatmap.js', function() {
                callback.call(this);
            });
        });
    },

    _createHeatmapLayers: function() {
        this._heatmapLayers = Object.keys(materials).reduce(function(heatmapLayers, materialName) {
            var color = materials[materialName].color;

            heatmapLayers[materialName] = new HeatmapOverlay(
                Rift.object.assign(Object.create(heatmapLayerConf), {
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
    _updateTFCityAndBCityList: function(selectedCityTransliteratedName) {
        var bCityList = this._bCityList;
        var bcCityListLinks = this._bcCityListLinks = {};

        Object.keys(this._cities).forEach(function(cityTransliteratedName) {
            var cityData = this._cities[cityTransliteratedName];

            var link = Rift.dom.createElementFromHTML(
                '<a data-transliterated-name="%1" href="#%1">%2</a>',
                cityTransliteratedName,
                cityData.name
            );

            var li = Rift.dom.createElement('li', null, [link]);

            bcCityListLinks[cityTransliteratedName] = link;
            bCityList.appendChild(li);
        }, this);

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

    _updateBMaterials: function() {
        var bMaterials = this._bMaterials;

        this._bcMaterialOptions = Object.keys(materials).reduce(function(bcMaterialOptions, materialName) {
            var label = Rift.dom.createElementFromHTML(
                '<label class="chb _material-%1"><input type="checkbox" checked="checked" /><span></span>%2</label>',
                materials[materialName].enName,
                materialName
            );

            bcMaterialOptions[materialName] = label.firstChild;
            bMaterials.appendChild(label);

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

            var transliteratedCityName = link.dataset.transliteratedName;
            var cityData = this._cities[transliteratedCityName];

            this._map.panTo(cityData.coords);

            this._setCityInControlPanel(transliteratedCityName);

            if (cityData.materialData === undefined) {
                this._loadMaterialData(transliteratedCityName, this._updateHeatmapLayers);
            } else {
                this._updateHeatmapLayers();
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

        cityData.loadingMaterialData = true;

        Rift.ajax.jsonp(
            'MaterialsApp/data/cities/materials/' + transliteratedCityName + '.jsonp',
            function(materialData) {
                cityData.loadingMaterialData = false;
                cityData.materialData = materialData;

                loadingEmitter.emit('loaded:' + transliteratedCityName);
            },
            { callbackName: '_setCityMaterials' }
        );
    },

    _updateHeatmapLayers: function() {
        var transliteratedCityName = this._selectedCityTransliteratedName;

        if (!this._cities.hasOwnProperty(transliteratedCityName)) {
            return;
        }

        var cityData = this._cities[transliteratedCityName];

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
        this.element.classList.add('_state-cityList');

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
        this.element.classList.remove('_state-cityList');

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