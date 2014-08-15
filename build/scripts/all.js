(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

var krion = require('./krion/krion');

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

var MaterialsApp = krion.createClass(krion.Emitter, {
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
        krion.bindListeners(this);

        this.element = document.body;

        DG.then(function() {
            this._findBlocks();

            this._map = DG.map(this._bMap, {
                'center': [54.98, 82.89],
                'zoom': 13
            });

            this._loadScripts(function() {
                this._createHeatmapLayers();

                krion.ajax.jsonp('data/cities/index.jsonp', function(cities) {
                    this._cities = cities.reduce(function(cities, cityData) {
                        cities[cityData.transliteratedName] = cityData;
                        return cities;
                    }, {});

                    this._updateTFCityAndBCityList('Novosybyrsk');
                    this._updateBMaterials();
                    this._bindListeners();
                    this._loadMaterialData(this._selectedCityTransliteratedName, this._updateHeatmapLayers);
                }.bind(this), { callbackName: '_setData' });
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
        krion.dom.addScript('node_modules/heatmap.js/build/heatmap.js', function() {
            krion.dom.addScript('node_modules/heatmap.js/plugins/leaflet-heatmap.js', function() {
                callback.call(this);
            });
        });
    },

    _createHeatmapLayers: function() {
        this._heatmapLayers = Object.keys(materials).reduce(function(heatmapLayers, materialName) {
            var color = materials[materialName].color;

            heatmapLayers[materialName] = new HeatmapOverlay(
                krion.object.assign(Object.create(heatmapLayerConf), {
                    gradient: {
                        0: krion.tmpl.format('rgba(%1, %2, %3, 0)', hexToRGB(color)),
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

            var link = krion.dom.createElementFromHTML(
                '<a data-transliterated-name="%1" href="#%1">%2</a>',
                cityTransliteratedName,
                cityData.name
            );

            var li = krion.dom.createElement('li', null, [link]);

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
            var label = krion.dom.createElementFromHTML(
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

            this._setCityInControlPanel(transliteratedCityName);

            if (this._cities[transliteratedCityName].materialData === undefined) {
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
            (this._materialDataLoadingEmitter = new krion.Emitter());

        loadingEmitter.once('loaded:' + transliteratedCityName, callback, this);

        if (cityData.loadingMaterialData) {
            return;
        }

        cityData.loadingMaterialData = true;

        krion.ajax.jsonp(
            'data/cities/materials/' + transliteratedCityName + '.jsonp',
            function(materialData) {
                cityData.loadingMaterialData = false;
                cityData.materialData = materialData;

                loadingEmitter.emit('loaded:' + transliteratedCityName);
            },
            { callbackName: '_setData' }
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

},{"./krion/krion":2}],2:[function(require,module,exports){

(function(undefined) {

    var global = this;

    function krion() {
        //
    }

    var uidCounter = 0;

    /**
     * @returns {int}
     */
    function nextUID() {
        return ++uidCounter;
    }

    krion.nextUID = nextUID;

    // Object utils

    krion.object = {};

    /**
     * @param {Object} obj
     * @returns {int}
     */
    function getUID(obj) {
        return obj._uid || (obj._uid = ++uidCounter);
    }

    krion.object.getUID = getUID;

    /**
     * @param {Object} obj
     * @param {Object} source
     * @returns {Object}
     */
    function assign(obj, source) {
        Object.keys(source).forEach(function(name) {
            obj[name] = source[name];
        });

        return obj;
    }

    krion.object.assign = assign;

    /**
     * @param {Object} obj
     * @param {Object} source
     * @returns {Object}
     */
    function mixin(obj, source) {
        Object.getOwnPropertyNames(source).forEach(function(name) {
            Object.defineProperty(obj, name, Object.getOwnPropertyDescriptor(source, name));
        });

        return obj;
    }

    krion.object.mixin = mixin;

    /**
     * @param {Object} obj
     * @returns {Object}
     */
    function clone(obj) {
        return mixin(Object.create(Object.getPrototypeOf(obj)), obj);
    }

    krion.object.clone = clone;

    // Class utils

    /**
     * @param {Function} [[parent=Object]]
     * @param {Object} declaration
     * @param {string} [declaration.__name]
     * @param {Function} [declaration.constructor]
     * @param {Function} [declaration._init]
     * @returns {Function}
     */
    function createClass(parent, declaration) {
        if (arguments.length == 1) {
            declaration = parent;
            parent = Object;
        } else if (parent === undefined) {
            parent = Object;
        }

        var constructor;

        if (declaration.hasOwnProperty('constructor')) {
            constructor = declaration.constructor;
        } else {
            constructor = declaration.constructor = function constructor() {
                var instance = this instanceof constructor ? this : Object.create(constructor.prototype);

                if (instance._init) {
                    instance._init.apply(instance, arguments);
                }
                return instance;
            };
        }

        var proto = constructor.prototype = Object.create(typeof parent == 'function' ? parent.prototype : parent);

        if (declaration.static) {
            mixin(constructor, declaration.static);
            delete declaration.static;
        }

        mixin(proto, declaration);

        if (!proto.hasOwnProperty('toString') && proto.hasOwnProperty('__name')) {
            proto.toString = function() {
                return '[object ' + this.__name + ']';
            };
        }

        return constructor;
    }

    krion.createClass = createClass;

    var reListenerName = /^_on[A-Z]/;

    /**
     * @param {Object} instance
     * @param {Array<string>} [names]
     */
    function bindListeners(instance, names) {
        if (names) {
            names.forEach(function(name) {
                instance[name] = instance[name].bind(instance);
            });
        } else {
            var listeners = instance.constructor._listenersForBinding;
            var name;

            if (!listeners) {
                listeners = instance.constructor._listenersForBinding = Object.create(null);

                for (name in instance) {
                    if (reListenerName.test(name)) {
                        listeners[name] = instance[name];
                    }
                }
            }

            for (name in listeners) {
                instance[name] = instance[name].bind(instance);
            }
        }
    }

    krion.bindListeners = bindListeners;

    // RegExp utils

    krion.regex = {};

    /**
     * @param {string} re
     * @returns {string}
     */
    function escapeRegExp(re) {
        return re.replace(/([?![+\-\.]^|{}(=:)$\/\\*])/g, '\\$1');
    }

    krion.regex.escape = escape;

    // Template utils

    krion.tmpl = {};

    /**
     * @param {string} str
     * @param {Array} values
     * @returns {string}
     */
    function format(str, values) {
        if (!Array.isArray(values)) {
            values = Array.prototype.slice.call(arguments, 1);
        }

        return str.replace(/%(\d+)/g, function(match, num) {
            return values[Number(num) - 1];
        });
    }

    krion.tmpl.format = format;

    // DOM utils

    krion.dom = {};

    /**
     * @param {Node} node
     * @param {Node} ancestor
     * @param {Node} [limitNode]
     * @returns {boolean}
     */
    function isDescendantOf(node, ancestor, limitNode) {
        if (limitNode) {
            while (node = node.parentNode) {
                if (node == ancestor) {
                    return true;
                }
                if (node == limitNode) {
                    break;
                }
            }
        } else {
            while (node = node.parentNode) {
                if (node == ancestor) {
                    return true;
                }
            }
        }
        return false;
    }

    krion.dom.isDescendantOf = isDescendantOf;

    /**
     * @param {Node} node
     * @param {Node} ancestor
     * @param {Node} [limitNode]
     * @returns {boolean}
     */
    function isSelfOrDescendantOf(node, ancestor, limitNode) {
        return node == ancestor || isDescendantOf(node, ancestor, limitNode);
    }

    krion.dom.isSelfOrDescendantOf = isSelfOrDescendantOf;

    /**
     * @param {string} tagName
     * @param {Object<string>} [attributes]
     * @param {Array<Node|string>|HTMLElement|DocumentFragment} [subnodes]
     * @returns {HTMLElement}
     */
    function createElement(tagName, attributes, subnodes) {
        return setElement(document.createElement(tagName), attributes, subnodes);
    }

    krion.dom.createElement = createElement;

    /**
     * @param {string} html
     * @param {Array} [values]
     * @returns {HTMLElement}
     */
    function createElementFromHTML(html, values) {
        var el = document.createElement('div');

        if (arguments.length > 1) {
            if (!Array.isArray(values)) {
                values = Array.prototype.slice.call(arguments, 1);
            }

            html = format(html, values);
        }

        el.innerHTML = html;

        return el.childNodes.length == 1 && el.firstChild.nodeType == 1 ? el.firstChild : el;
    }

    krion.dom.createElementFromHTML = createElementFromHTML;

    /**
     * @param {HTMLElement} el
     * @param {Object<string>} [attributes]
     * @param {Array<Node|string>|HTMLElement|DocumentFragment} [subnodes]
     * @returns {HTMLElement}
     */
    function setElement(el, attributes, subnodes) {
        if (attributes != null) {
            Object.keys(attributes).forEach(function(name) {
                el.setAttribute(name, attributes[name]);
            });
        }

        if (subnodes != null) {
            if (Array.isArray(subnodes)) {
                subnodes.forEach(function(subnode) {
                    el.appendChild(typeof subnode == 'string' ? document.createTextNode(subnode) : subnode);
                });
            } else {
                switch (subnodes.nodeType) {
                    case 1: // ELEMENT_NODE
                        moveChildren(subnodes, el);
                        break;
                    case 11: // DOCUMENT_FRAGMENT_NODE
                        el.appendChild(subnodes);
                        break;
                }
            }
        }

        return el;
    }

    krion.dom.setElement = setElement;

    /**
     * @param {Node} node
     * @param {Node} target
     * @returns {Node}
     */
    function moveChildren(node, target) {
        if (node != target) {
            while (node.firstChild) {
                target.appendChild(node.firstChild);
            }
        }
        return target;
    }

    krion.dom.moveChildren = moveChildren;

    /**
     * @param {Node} node
     * @returns {Node}
     */
    function removeNode(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
        return node;
    }

    krion.dom.removeNode = removeNode;

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

    krion.dom.addScript = addScript;

    // AJAX utils

    krion.ajax = {};

    /**
     * @param {string} url
     * @param {Function} callback
     * @param {Object} [options]
     * @param {string} [options.callbackKey='callback']
     * @param {string} [options.callbackName]
     * @param {boolean} [options.preventCaching=true]
     * @param {boolean} [options.cachingPreventionKey='_r']
     * @param {int} [options.timeout=30000]
     * @param {Function} [options.onFailure]
     */
    function jsonp(url, callback, options) {
        if (options == null) {
            options = {};
        }

        if (!options.callbackKey) { options.callbackKey = 'callback'; }
        if (!options.callbackName) { options.callbackName = '__callback' + nextUID(); }
        if (options.preventCaching === undefined) { options.preventCaching = true; }
        if (!options.cachingPreventionKey) { options.cachingPreventionKey = '_r'; }
        if (!options.timeout) { options.timeout = 30000; }

        var script = document.createElement('script');

        script.src = url + (url.indexOf('?') != -1 ? '&' : '?') + options.callbackKey + '=' + options.callbackName +
            (options.preventCaching ? '&' + options.cachingPreventionKey + '=' + Math.random() : '');
        script.async = true;

        script.onerror = function() {
            clear();

            if (options.onFailure) {
                options.onFailure.call(window);
            }
        };

        window[options.callbackName] = function() {
            clear();
            callback.apply(this, arguments);
        };

        var timerId = setTimeout(function() {
            clear();

            if (options.onFailure) {
                options.onFailure.call(window);
            }
        }, options.timeout);

        function clear() {
            clearTimeout(timerId);
            delete window[options.callbackName];
            script.onerror = null;
            script.parentNode.removeChild(script);
        }

        (document.head || document.documentElement).appendChild(script);
    }

    krion.ajax.jsonp = jsonp;

    // Emitter

    var Emitter = krion.Emitter = createClass({
        __name: 'krion.Emitter',

        _events: null,

        _listeningTo: null,

        /**
         * @param {string} type
         * @param {Function} listener
         * @param {Object} [context]
         * @returns {krion.Emitter}
         */
        on: function(type, listener, context) {
            var events = this._events || (this._events = Object.create(null));

            (events[type] || (events[type] = [])).push({
                listener: listener,
                context: context
            });

            return this;
        },

        /**
         * @param {string} [type]
         * @param {Function} [listener]
         * @param {Object} [context]
         * @returns {krion.Emitter}
         */
        off: function(type, listener, context) {
            var events = this._events;

            if (!events) {
                return this;
            }

            if (type === undefined) {
                var types = Object.keys(events);
                var i = types.length;

                while (i) {
                    this.off(types[--i], listener, context);
                }

                return this;
            }

            events = events[type];

            if (events) {
                var i = events.length;

                while (i) {
                    var event = events[--i];

                    if (
                        (listener === undefined || listener == event.listener || listener == event.listener._inner) &&
                            context == event.context
                    ) {
                        events.splice(i, 1);
                    }
                }

                if (!events.length) {
                    delete this._events[type];
                }
            }

            return this;
        },

        /**
         * @param {string} type
         * @param {Function} listener
         * @param {Object} [context]
         * @returns {krion.Emitter}
         */
        once: function(type, listener, context) {
            function wrapper() {
                this.off(type, wrapper);
                listener.apply(this, arguments);
            }
            wrapper._inner = listener;

            return this.on(type, wrapper, context);
        },

        /**
         * @param {string} type
         * @param {*} ...args
         * @returns {krion.Emitter}
         */
        emit: function(type) {
            var events = (this._events || (this._events = Object.create(null)))[type];

            if (events) {
                var args = Array.prototype.slice.call(arguments, 1);

                for (var i = 0, l = events.length; i < l; i++) {
                    events[i].listener.apply(events[i].context || this, args);
                }
            }

            return this;
        },

        /**
         * @param {Object} target
         * @param {string} type
         * @param {Function} listener
         * @param {Object} [context]
         * @returns {krion.Emitter}
         */
        listenTo: function(target, type, listener, context) {
            var listeningTo = this._listeningTo || (this._listeningTo = Object.create(null));
            var id = getUID(target) + '-' + type + '-' + getUID(listener) + (context ? getUID(context) : '0');

            if (!(id in listeningTo)) {
                listeningTo[id] = {
                    target: target,
                    type: type,
                    listener: listener,
                    context: context
                };

                if (target.addEventListener) {
                    if (context) {
                        var wrapper = listeningTo[id].wrapper = listener.bind(context);
                        wrapper._inner = listener;

                        target.addEventListener(type, wrapper);
                    } else {
                        target.addEventListener(type, listener);
                    }
                } else {
                    target.on(type, listener, context);
                }
            }

            return this;
        },

        /**
         * @param {Object} target
         * @param {string} type
         * @param {Function} listener
         * @param {Object} [context]
         * @returns {krion.Emitter}
         */
        stopListening: function(target, type, listener, context) {
            var listeningTo = this._listeningTo || (this._listeningTo = Object.create(null));

            if (arguments.length) {
                var id = getUID(target) + '-' + type + '-' + getUID(listener) + (context ? getUID(context) : '0');

                if (id in listeningTo) {
                    removeListener(listeningTo[id]);
                    delete listeningTo[id];
                }
            } else {
                for (var id in listeningTo) {
                    removeListener(listeningTo[id]);
                    delete listeningTo[id];
                }
            }

            return this;
        }
    });

    function removeListener(event) {
        if (event.target.removeEventListener) {
            event.target.removeEventListener(event.type, event.context ? event.wrapper : event.listener);
        } else {
            event.target.off(event.type, event.listener, event.context);
        }
    }

    if (typeof exports != 'undefined') {
        if (typeof module != 'undefined' && module.exports) {
            module.exports = krion;
        } else {
            exports.krion = krion;
        }
    } else {
        window.krion = krion;
    }

})();

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9kLnZpYmUvMmdpcy8yZ2lzLW1hdGVyaWFscy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZC52aWJlLzJnaXMvMmdpcy1tYXRlcmlhbHMvc2NyaXB0cy9mYWtlX2Y0YjNkZDQ0LmpzIiwiL1VzZXJzL2QudmliZS8yZ2lzLzJnaXMtbWF0ZXJpYWxzL3NjcmlwdHMva3Jpb24va3Jpb24uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1WUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG52YXIga3Jpb24gPSByZXF1aXJlKCcuL2tyaW9uL2tyaW9uJyk7XG5cbi8qKlxuICogQHBhcmFtIHtzdHJpbmd9IGhleFxuICogQHJldHVybiB7QXJyYXl7IDA6aW50OyAxOmludDsgMjppbnQ7IH19XG4gKi9cbmZ1bmN0aW9uIGhleFRvUkdCKGhleCkge1xuICAgIGlmIChoZXguY2hhckF0KDApID09ICcjJykge1xuICAgICAgICBoZXggPSBoZXguc2xpY2UoMSk7XG4gICAgfVxuXG4gICAgaWYgKGhleC5sZW5ndGggPT0gMykge1xuICAgICAgICBoZXggPSBoZXguY2hhckF0KDApICsgaGV4LmNoYXJBdCgwKSArIGhleC5jaGFyQXQoMSkgKyBoZXguY2hhckF0KDEpICsgaGV4LmNoYXJBdCgyKSArIGhleC5jaGFyQXQoMik7XG4gICAgfVxuXG4gICAgcmV0dXJuIFtcbiAgICAgICAgTnVtYmVyKCcweCcgKyBoZXguc2xpY2UoMCwgMikpLFxuICAgICAgICBOdW1iZXIoJzB4JyArIGhleC5zbGljZSgyLCA0KSksXG4gICAgICAgIE51bWJlcignMHgnICsgaGV4LnNsaWNlKDQpKVxuICAgIF07XG59XG5cbnZhciBtYXRlcmlhbHMgPSB7XG4gICAgJ9CU0LXRgNC10LLQvic6IHsgY29sb3I6ICcjYjQ3ZTRkJywgZW5OYW1lOiAnd29vZCcgfSxcbiAgICAn0JrQuNGA0L/QuNGHJzogeyBjb2xvcjogJyNmZjY0NjQnLCBlbk5hbWU6ICdicmljaycgfSxcbiAgICAn0J/QsNC90LXQu9GMJzogeyBjb2xvcjogJyMwMDg5NjUnLCBlbk5hbWU6ICdwYW5lbCcgfSxcbiAgICAn0JHQtdGC0L7QvSc6IHsgY29sb3I6ICcjYTA0MDg5JywgZW5OYW1lOiAnY29uY3JldGUnIH0sXG4gICAgJ9Cc0LXRgtCw0LvQuyc6IHsgY29sb3I6ICcjMDA4OGZmJywgZW5OYW1lOiAnbWV0YWwnIH1cbn07XG5cbnZhciBoZWF0bWFwTGF5ZXJDb25mID0ge1xuICAgIC8vIHJhZGl1cyBzaG91bGQgYmUgc21hbGwgT05MWSBpZiBzY2FsZVJhZGl1cyBpcyB0cnVlIChvciBzbWFsbCByYWRpdXMgaXMgaW50ZW5kZWQpXG4gICAgLy8gaWYgc2NhbGVSYWRpdXMgaXMgZmFsc2UgaXQgd2lsbCBiZSB0aGUgY29uc3RhbnQgcmFkaXVzIHVzZWQgaW4gcGl4ZWxzXG4gICAgcmFkaXVzOiAwLjAwMDUsXG5cbiAgICBtYXhPcGFjaXR5OiAwLjcsXG5cbiAgICAvLyBzY2FsZXMgdGhlIHJhZGl1cyBiYXNlZCBvbiBtYXAgem9vbVxuICAgIHNjYWxlUmFkaXVzOiB0cnVlLFxuXG4gICAgYmx1cjogMS4wLFxuXG4gICAgLy8gaWYgc2V0IHRvIGZhbHNlIHRoZSBoZWF0bWFwIHVzZXMgdGhlIGdsb2JhbCBtYXhpbXVtIGZvciBjb2xvcml6YXRpb25cbiAgICAvLyBpZiBhY3RpdmF0ZWQ6IHVzZXMgdGhlIGRhdGEgbWF4aW11bSB3aXRoaW4gdGhlIGN1cnJlbnQgbWFwIGJvdW5kYXJpZXNcbiAgICAvLyAgICh0aGVyZSB3aWxsIGFsd2F5cyBiZSBhIHJlZCBzcG90IHdpdGggdXNlTG9jYWxFeHRyZW1hcyB0cnVlKVxuICAgIHVzZUxvY2FsRXh0cmVtYTogdHJ1ZSxcblxuICAgIGxhdEZpZWxkOiAnbGF0JyxcbiAgICBsbmdGaWVsZDogJ2xuZycsXG4gICAgdmFsdWVGaWVsZDogJ2NvdW50J1xufTtcblxudmFyIE1hdGVyaWFsc0FwcCA9IGtyaW9uLmNyZWF0ZUNsYXNzKGtyaW9uLkVtaXR0ZXIsIHtcbiAgICBfX25hbWU6ICdNYXRlcmlhbHNBcHAnLFxuXG4gICAgX2NpdGllczogbnVsbCxcbiAgICBfc2VsZWN0ZWRDaXR5VHJhbnNsaXRlcmF0ZWROYW1lOiBudWxsLFxuXG4gICAgX21hdGVyaWFsRGF0YUxvYWRpbmdFbWl0dGVyOiBudWxsLFxuXG4gICAgX2NpdHlMaXN0SXNTaG93bjogZmFsc2UsXG5cbiAgICBfbWFwOiBudWxsLFxuXG4gICAgX2hlYXRtYXBMYXllcnM6IG51bGwsXG5cbiAgICBlbGVtZW50OiBudWxsLFxuICAgIF9iTWFwOiBudWxsLFxuICAgIF90ZkNpdHk6IG51bGwsXG4gICAgX2JNYXRlcmlhbHM6IG51bGwsXG4gICAgX2JjTWF0ZXJpYWxPcHRpb25zOiBudWxsLFxuICAgIF9iQ2l0eUxpc3Q6IG51bGwsXG4gICAgX2JjQ2l0eUxpc3RMaW5rczogbnVsbCxcbiAgICBfYnRuUmVhZE1vcmU6IG51bGwsXG5cbiAgICBfaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGtyaW9uLmJpbmRMaXN0ZW5lcnModGhpcyk7XG5cbiAgICAgICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuYm9keTtcblxuICAgICAgICBERy50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5fZmluZEJsb2NrcygpO1xuXG4gICAgICAgICAgICB0aGlzLl9tYXAgPSBERy5tYXAodGhpcy5fYk1hcCwge1xuICAgICAgICAgICAgICAgICdjZW50ZXInOiBbNTQuOTgsIDgyLjg5XSxcbiAgICAgICAgICAgICAgICAnem9vbSc6IDEzXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5fbG9hZFNjcmlwdHMoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY3JlYXRlSGVhdG1hcExheWVycygpO1xuXG4gICAgICAgICAgICAgICAga3Jpb24uYWpheC5qc29ucCgnZGF0YS9jaXRpZXMvaW5kZXguanNvbnAnLCBmdW5jdGlvbihjaXRpZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fY2l0aWVzID0gY2l0aWVzLnJlZHVjZShmdW5jdGlvbihjaXRpZXMsIGNpdHlEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaXRpZXNbY2l0eURhdGEudHJhbnNsaXRlcmF0ZWROYW1lXSA9IGNpdHlEYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNpdGllcztcbiAgICAgICAgICAgICAgICAgICAgfSwge30pO1xuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZVRGQ2l0eUFuZEJDaXR5TGlzdCgnTm92b3N5Ynlyc2snKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fdXBkYXRlQk1hdGVyaWFscygpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9iaW5kTGlzdGVuZXJzKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2xvYWRNYXRlcmlhbERhdGEodGhpcy5fc2VsZWN0ZWRDaXR5VHJhbnNsaXRlcmF0ZWROYW1lLCB0aGlzLl91cGRhdGVIZWF0bWFwTGF5ZXJzKTtcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcyksIHsgY2FsbGJhY2tOYW1lOiAnX3NldERhdGEnIH0pO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICB9LFxuXG4gICAgX2ZpbmRCbG9ja3M6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZWwgPSB0aGlzLmVsZW1lbnQ7XG5cbiAgICAgICAgdGhpcy5fYk1hcCA9IGVsLnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLW5hbWU9Yk1hcF0nKTtcbiAgICAgICAgdGhpcy5fdGZDaXR5ID0gZWwucXVlcnlTZWxlY3RvcignW2RhdGEtbmFtZT10ZkNpdHldJyk7XG4gICAgICAgIHRoaXMuX2JNYXRlcmlhbHMgPSBlbC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1uYW1lPWJNYXRlcmlhbHNdJyk7XG4gICAgICAgIHRoaXMuX2JDaXR5TGlzdCA9IGVsLnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLW5hbWU9YkNpdHlMaXN0XScpO1xuICAgICAgICB0aGlzLl9idG5SZWFkTW9yZSA9IGVsLnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLW5hbWU9YnRuUmVhZE1vcmVdJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICovXG4gICAgX2xvYWRTY3JpcHRzOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICBrcmlvbi5kb20uYWRkU2NyaXB0KCdub2RlX21vZHVsZXMvaGVhdG1hcC5qcy9idWlsZC9oZWF0bWFwLmpzJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBrcmlvbi5kb20uYWRkU2NyaXB0KCdub2RlX21vZHVsZXMvaGVhdG1hcC5qcy9wbHVnaW5zL2xlYWZsZXQtaGVhdG1hcC5qcycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwodGhpcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIF9jcmVhdGVIZWF0bWFwTGF5ZXJzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5faGVhdG1hcExheWVycyA9IE9iamVjdC5rZXlzKG1hdGVyaWFscykucmVkdWNlKGZ1bmN0aW9uKGhlYXRtYXBMYXllcnMsIG1hdGVyaWFsTmFtZSkge1xuICAgICAgICAgICAgdmFyIGNvbG9yID0gbWF0ZXJpYWxzW21hdGVyaWFsTmFtZV0uY29sb3I7XG5cbiAgICAgICAgICAgIGhlYXRtYXBMYXllcnNbbWF0ZXJpYWxOYW1lXSA9IG5ldyBIZWF0bWFwT3ZlcmxheShcbiAgICAgICAgICAgICAgICBrcmlvbi5vYmplY3QuYXNzaWduKE9iamVjdC5jcmVhdGUoaGVhdG1hcExheWVyQ29uZiksIHtcbiAgICAgICAgICAgICAgICAgICAgZ3JhZGllbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIDA6IGtyaW9uLnRtcGwuZm9ybWF0KCdyZ2JhKCUxLCAlMiwgJTMsIDApJywgaGV4VG9SR0IoY29sb3IpKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIDE6IGNvbG9yXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgcmV0dXJuIGhlYXRtYXBMYXllcnM7XG4gICAgICAgIH0sIHt9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtzZWxlY3RlZENpdHlUcmFuc2xpdGVyYXRlZE5hbWVdXG4gICAgICovXG4gICAgX3VwZGF0ZVRGQ2l0eUFuZEJDaXR5TGlzdDogZnVuY3Rpb24oc2VsZWN0ZWRDaXR5VHJhbnNsaXRlcmF0ZWROYW1lKSB7XG4gICAgICAgIHZhciBiQ2l0eUxpc3QgPSB0aGlzLl9iQ2l0eUxpc3Q7XG4gICAgICAgIHZhciBiY0NpdHlMaXN0TGlua3MgPSB0aGlzLl9iY0NpdHlMaXN0TGlua3MgPSB7fTtcblxuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLl9jaXRpZXMpLmZvckVhY2goZnVuY3Rpb24oY2l0eVRyYW5zbGl0ZXJhdGVkTmFtZSkge1xuICAgICAgICAgICAgdmFyIGNpdHlEYXRhID0gdGhpcy5fY2l0aWVzW2NpdHlUcmFuc2xpdGVyYXRlZE5hbWVdO1xuXG4gICAgICAgICAgICB2YXIgbGluayA9IGtyaW9uLmRvbS5jcmVhdGVFbGVtZW50RnJvbUhUTUwoXG4gICAgICAgICAgICAgICAgJzxhIGRhdGEtdHJhbnNsaXRlcmF0ZWQtbmFtZT1cIiUxXCIgaHJlZj1cIiMlMVwiPiUyPC9hPicsXG4gICAgICAgICAgICAgICAgY2l0eVRyYW5zbGl0ZXJhdGVkTmFtZSxcbiAgICAgICAgICAgICAgICBjaXR5RGF0YS5uYW1lXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICB2YXIgbGkgPSBrcmlvbi5kb20uY3JlYXRlRWxlbWVudCgnbGknLCBudWxsLCBbbGlua10pO1xuXG4gICAgICAgICAgICBiY0NpdHlMaXN0TGlua3NbY2l0eVRyYW5zbGl0ZXJhdGVkTmFtZV0gPSBsaW5rO1xuICAgICAgICAgICAgYkNpdHlMaXN0LmFwcGVuZENoaWxkKGxpKTtcbiAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgaWYgKHNlbGVjdGVkQ2l0eVRyYW5zbGl0ZXJhdGVkTmFtZSkge1xuICAgICAgICAgICAgdGhpcy5fc2V0Q2l0eUluQ29udHJvbFBhbmVsKHNlbGVjdGVkQ2l0eVRyYW5zbGl0ZXJhdGVkTmFtZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRyYW5zbGl0ZXJhdGVkQ2l0eU5hbWVcbiAgICAgKi9cbiAgICBfc2V0Q2l0eUluQ29udHJvbFBhbmVsOiBmdW5jdGlvbih0cmFuc2xpdGVyYXRlZENpdHlOYW1lKSB7XG4gICAgICAgIHZhciBjaXR5RGF0YSA9IHRoaXMuX2NpdGllc1t0cmFuc2xpdGVyYXRlZENpdHlOYW1lXTtcblxuICAgICAgICBpZiAodGhpcy5fc2VsZWN0ZWRDaXR5VHJhbnNsaXRlcmF0ZWROYW1lKSB7XG4gICAgICAgICAgICB0aGlzLl90ZkNpdHkuY2xhc3NMaXN0LnJlbW92ZSgnX2NpdHktJyArIHRoaXMuX3NlbGVjdGVkQ2l0eVRyYW5zbGl0ZXJhdGVkTmFtZSk7XG4gICAgICAgICAgICB0aGlzLl9iY0NpdHlMaXN0TGlua3NbdGhpcy5fc2VsZWN0ZWRDaXR5VHJhbnNsaXRlcmF0ZWROYW1lXS5jbGFzc0xpc3QucmVtb3ZlKCdfc2VsZWN0ZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3NlbGVjdGVkQ2l0eVRyYW5zbGl0ZXJhdGVkTmFtZSA9IHRyYW5zbGl0ZXJhdGVkQ2l0eU5hbWU7XG5cbiAgICAgICAgdGhpcy5fdGZDaXR5LmNsYXNzTGlzdC5hZGQoJ19jaXR5LScgKyB0cmFuc2xpdGVyYXRlZENpdHlOYW1lKTtcbiAgICAgICAgdGhpcy5fdGZDaXR5Lmxhc3RFbGVtZW50Q2hpbGQuaW5uZXJIVE1MID0gY2l0eURhdGEubmFtZTtcbiAgICAgICAgdGhpcy5fYmNDaXR5TGlzdExpbmtzW3RyYW5zbGl0ZXJhdGVkQ2l0eU5hbWVdLmNsYXNzTGlzdC5hZGQoJ19zZWxlY3RlZCcpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlQk1hdGVyaWFsczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBiTWF0ZXJpYWxzID0gdGhpcy5fYk1hdGVyaWFscztcblxuICAgICAgICB0aGlzLl9iY01hdGVyaWFsT3B0aW9ucyA9IE9iamVjdC5rZXlzKG1hdGVyaWFscykucmVkdWNlKGZ1bmN0aW9uKGJjTWF0ZXJpYWxPcHRpb25zLCBtYXRlcmlhbE5hbWUpIHtcbiAgICAgICAgICAgIHZhciBsYWJlbCA9IGtyaW9uLmRvbS5jcmVhdGVFbGVtZW50RnJvbUhUTUwoXG4gICAgICAgICAgICAgICAgJzxsYWJlbCBjbGFzcz1cImNoYiBfbWF0ZXJpYWwtJTFcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2hlY2tlZD1cImNoZWNrZWRcIiAvPjxzcGFuPjwvc3Bhbj4lMjwvbGFiZWw+JyxcbiAgICAgICAgICAgICAgICBtYXRlcmlhbHNbbWF0ZXJpYWxOYW1lXS5lbk5hbWUsXG4gICAgICAgICAgICAgICAgbWF0ZXJpYWxOYW1lXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBiY01hdGVyaWFsT3B0aW9uc1ttYXRlcmlhbE5hbWVdID0gbGFiZWwuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgIGJNYXRlcmlhbHMuYXBwZW5kQ2hpbGQobGFiZWwpO1xuXG4gICAgICAgICAgICByZXR1cm4gYmNNYXRlcmlhbE9wdGlvbnM7XG4gICAgICAgIH0sIHt9KTtcbiAgICB9LFxuXG4gICAgX2JpbmRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuX3RmQ2l0eSwgJ2NsaWNrJywgdGhpcy5fb25URkNpdHlDbGljayk7XG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLl9iQ2l0eUxpc3QsICdjbGljaycsIHRoaXMuX29uQkNpdHlMaXN0Q2xpY2spO1xuXG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMuX2JjTWF0ZXJpYWxPcHRpb25zKS5mb3JFYWNoKGZ1bmN0aW9uKG1hdGVyaWFsTmFtZSkge1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLl9iY01hdGVyaWFsT3B0aW9uc1ttYXRlcmlhbE5hbWVdLCAnY2hhbmdlJywgdGhpcy5fb25CQ01hdGVyaWFsT3B0aW9uc0NoYW5nZSk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge01vdXNlRXZlbnR9IGV2dFxuICAgICAqL1xuICAgIF9vblRGQ2l0eUNsaWNrOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgdGhpcy50b29nbGVDaXR5TGlzdCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge01vdXNlRXZlbnR9IGV2dFxuICAgICAqL1xuICAgIF9vbkJDaXR5TGlzdENsaWNrOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBsaW5rO1xuICAgICAgICAgICAgdmFyIG5vZGUgPSBldnQudGFyZ2V0O1xuXG4gICAgICAgICAgICB3aGlsZSAobm9kZSAhPSB0aGlzLl9iQ2l0eUxpc3QpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZS50YWdOYW1lID09ICdBJykge1xuICAgICAgICAgICAgICAgICAgICBsaW5rID0gbm9kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFsaW5rKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgdHJhbnNsaXRlcmF0ZWRDaXR5TmFtZSA9IGxpbmsuZGF0YXNldC50cmFuc2xpdGVyYXRlZE5hbWU7XG5cbiAgICAgICAgICAgIHRoaXMuX3NldENpdHlJbkNvbnRyb2xQYW5lbCh0cmFuc2xpdGVyYXRlZENpdHlOYW1lKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuX2NpdGllc1t0cmFuc2xpdGVyYXRlZENpdHlOYW1lXS5tYXRlcmlhbERhdGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2xvYWRNYXRlcmlhbERhdGEodHJhbnNsaXRlcmF0ZWRDaXR5TmFtZSwgdGhpcy5fdXBkYXRlSGVhdG1hcExheWVycyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUhlYXRtYXBMYXllcnMoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5oaWRlQ2l0eUxpc3QoKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpLCAxKTtcbiAgICB9LFxuXG4gICAgX29uQkNNYXRlcmlhbE9wdGlvbnNDaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5fdXBkYXRlSGVhdG1hcExheWVycygpO1xuICAgICAgICB9LmJpbmQodGhpcyksIDEpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHJhbnNsaXRlcmF0ZWRDaXR5TmFtZVxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICovXG4gICAgX2xvYWRNYXRlcmlhbERhdGE6IGZ1bmN0aW9uKHRyYW5zbGl0ZXJhdGVkQ2l0eU5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBjaXR5RGF0YSA9IHRoaXMuX2NpdGllc1t0cmFuc2xpdGVyYXRlZENpdHlOYW1lXTtcblxuICAgICAgICBpZiAoY2l0eURhdGEubWF0ZXJpYWxEYXRhKSB7XG4gICAgICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGxvYWRpbmdFbWl0dGVyID0gdGhpcy5fbWF0ZXJpYWxEYXRhTG9hZGluZ0VtaXR0ZXIgfHxcbiAgICAgICAgICAgICh0aGlzLl9tYXRlcmlhbERhdGFMb2FkaW5nRW1pdHRlciA9IG5ldyBrcmlvbi5FbWl0dGVyKCkpO1xuXG4gICAgICAgIGxvYWRpbmdFbWl0dGVyLm9uY2UoJ2xvYWRlZDonICsgdHJhbnNsaXRlcmF0ZWRDaXR5TmFtZSwgY2FsbGJhY2ssIHRoaXMpO1xuXG4gICAgICAgIGlmIChjaXR5RGF0YS5sb2FkaW5nTWF0ZXJpYWxEYXRhKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjaXR5RGF0YS5sb2FkaW5nTWF0ZXJpYWxEYXRhID0gdHJ1ZTtcblxuICAgICAgICBrcmlvbi5hamF4Lmpzb25wKFxuICAgICAgICAgICAgJ2RhdGEvY2l0aWVzL21hdGVyaWFscy8nICsgdHJhbnNsaXRlcmF0ZWRDaXR5TmFtZSArICcuanNvbnAnLFxuICAgICAgICAgICAgZnVuY3Rpb24obWF0ZXJpYWxEYXRhKSB7XG4gICAgICAgICAgICAgICAgY2l0eURhdGEubG9hZGluZ01hdGVyaWFsRGF0YSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGNpdHlEYXRhLm1hdGVyaWFsRGF0YSA9IG1hdGVyaWFsRGF0YTtcblxuICAgICAgICAgICAgICAgIGxvYWRpbmdFbWl0dGVyLmVtaXQoJ2xvYWRlZDonICsgdHJhbnNsaXRlcmF0ZWRDaXR5TmFtZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgeyBjYWxsYmFja05hbWU6ICdfc2V0RGF0YScgfVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlSGVhdG1hcExheWVyczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB0cmFuc2xpdGVyYXRlZENpdHlOYW1lID0gdGhpcy5fc2VsZWN0ZWRDaXR5VHJhbnNsaXRlcmF0ZWROYW1lO1xuXG4gICAgICAgIGlmICghdGhpcy5fY2l0aWVzLmhhc093blByb3BlcnR5KHRyYW5zbGl0ZXJhdGVkQ2l0eU5hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY2l0eURhdGEgPSB0aGlzLl9jaXRpZXNbdHJhbnNsaXRlcmF0ZWRDaXR5TmFtZV07XG5cbiAgICAgICAgaWYgKGNpdHlEYXRhLm1hdGVyaWFsRGF0YSA9PT0gdW5kZWZpbmVkIHx8IGNpdHlEYXRhLmxvYWRpbmdNYXRlcmlhbERhdGEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBoZWF0bWFwTGF5ZXJzID0gdGhpcy5faGVhdG1hcExheWVycztcblxuICAgICAgICBPYmplY3Qua2V5cyhjaXR5RGF0YS5tYXRlcmlhbERhdGEpLmZvckVhY2goZnVuY3Rpb24obWF0ZXJpYWxOYW1lKSB7XG4gICAgICAgICAgICBpZiAoIW1hdGVyaWFscy5oYXNPd25Qcm9wZXJ0eShtYXRlcmlhbE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIXRoaXMuX2JjTWF0ZXJpYWxPcHRpb25zW21hdGVyaWFsTmFtZV0uY2hlY2tlZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX21hcC5yZW1vdmVMYXllcihoZWF0bWFwTGF5ZXJzW21hdGVyaWFsTmFtZV0pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fbWFwLmFkZExheWVyKGhlYXRtYXBMYXllcnNbbWF0ZXJpYWxOYW1lXSk7XG5cbiAgICAgICAgICAgIHZhciBoZWF0bWFwTGF5ZXJEYXRhID0gT2JqZWN0LmtleXMoY2l0eURhdGEubWF0ZXJpYWxEYXRhW21hdGVyaWFsTmFtZV0pLm1hcChmdW5jdGlvbihpZCkge1xuICAgICAgICAgICAgICAgIHZhciBpdGVtID0gdGhpc1tpZF07XG5cbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBsYXQ6ICtpdGVtWzFdLFxuICAgICAgICAgICAgICAgICAgICBsbmc6ICtpdGVtWzBdLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogMVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9LCBjaXR5RGF0YS5tYXRlcmlhbERhdGFbbWF0ZXJpYWxOYW1lXSk7XG5cbiAgICAgICAgICAgIGhlYXRtYXBMYXllcnNbbWF0ZXJpYWxOYW1lXS5zZXREYXRhKHtcbiAgICAgICAgICAgICAgICBtYXg6IDgsXG4gICAgICAgICAgICAgICAgZGF0YTogaGVhdG1hcExheWVyRGF0YVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBzaG93Q2l0eUxpc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5fY2l0eUxpc3RJc1Nob3duKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9jaXR5TGlzdElzU2hvd24gPSB0cnVlO1xuICAgICAgICB0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LmFkZCgnX3N0YXRlLWNpdHlMaXN0Jyk7XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGhpZGVDaXR5TGlzdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghdGhpcy5fY2l0eUxpc3RJc1Nob3duKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9jaXR5TGlzdElzU2hvd24gPSBmYWxzZTtcbiAgICAgICAgdGhpcy5lbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoJ19zdGF0ZS1jaXR5TGlzdCcpO1xuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtzdGF0ZVZhbHVlXVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIHRvb2dsZUNpdHlMaXN0OiBmdW5jdGlvbihzdGF0ZVZhbHVlKSB7XG4gICAgICAgIGlmIChzdGF0ZVZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHN0YXRlVmFsdWUgPSAhdGhpcy5fY2l0eUxpc3RJc1Nob3duO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0YXRlVmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuc2hvd0NpdHlMaXN0KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmhpZGVDaXR5TGlzdCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHN0YXRlVmFsdWU7XG4gICAgfSxcblxuICAgIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICB9XG59KTtcblxud2luZG93Lm1hdGVyaWFsc0FwcCA9IG5ldyBNYXRlcmlhbHNBcHAoKTtcbiIsIlxuKGZ1bmN0aW9uKHVuZGVmaW5lZCkge1xuXG4gICAgdmFyIGdsb2JhbCA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiBrcmlvbigpIHtcbiAgICAgICAgLy9cbiAgICB9XG5cbiAgICB2YXIgdWlkQ291bnRlciA9IDA7XG5cbiAgICAvKipcbiAgICAgKiBAcmV0dXJucyB7aW50fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG5leHRVSUQoKSB7XG4gICAgICAgIHJldHVybiArK3VpZENvdW50ZXI7XG4gICAgfVxuXG4gICAga3Jpb24ubmV4dFVJRCA9IG5leHRVSUQ7XG5cbiAgICAvLyBPYmplY3QgdXRpbHNcblxuICAgIGtyaW9uLm9iamVjdCA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9ialxuICAgICAqIEByZXR1cm5zIHtpbnR9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0VUlEKG9iaikge1xuICAgICAgICByZXR1cm4gb2JqLl91aWQgfHwgKG9iai5fdWlkID0gKyt1aWRDb3VudGVyKTtcbiAgICB9XG5cbiAgICBrcmlvbi5vYmplY3QuZ2V0VUlEID0gZ2V0VUlEO1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9ialxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzb3VyY2VcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGFzc2lnbihvYmosIHNvdXJjZSkge1xuICAgICAgICBPYmplY3Qua2V5cyhzb3VyY2UpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgb2JqW25hbWVdID0gc291cmNlW25hbWVdO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH1cblxuICAgIGtyaW9uLm9iamVjdC5hc3NpZ24gPSBhc3NpZ247XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNvdXJjZVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAgICovXG4gICAgZnVuY3Rpb24gbWl4aW4ob2JqLCBzb3VyY2UpIHtcbiAgICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoc291cmNlKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIG5hbWUsIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc291cmNlLCBuYW1lKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAga3Jpb24ub2JqZWN0Lm1peGluID0gbWl4aW47XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gICAgICogQHJldHVybnMge09iamVjdH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjbG9uZShvYmopIHtcbiAgICAgICAgcmV0dXJuIG1peGluKE9iamVjdC5jcmVhdGUoT2JqZWN0LmdldFByb3RvdHlwZU9mKG9iaikpLCBvYmopO1xuICAgIH1cblxuICAgIGtyaW9uLm9iamVjdC5jbG9uZSA9IGNsb25lO1xuXG4gICAgLy8gQ2xhc3MgdXRpbHNcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtbcGFyZW50PU9iamVjdF1dXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRlY2xhcmF0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtkZWNsYXJhdGlvbi5fX25hbWVdXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2RlY2xhcmF0aW9uLmNvbnN0cnVjdG9yXVxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtkZWNsYXJhdGlvbi5faW5pdF1cbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlQ2xhc3MocGFyZW50LCBkZWNsYXJhdGlvbikge1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICBkZWNsYXJhdGlvbiA9IHBhcmVudDtcbiAgICAgICAgICAgIHBhcmVudCA9IE9iamVjdDtcbiAgICAgICAgfSBlbHNlIGlmIChwYXJlbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcGFyZW50ID0gT2JqZWN0O1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNvbnN0cnVjdG9yO1xuXG4gICAgICAgIGlmIChkZWNsYXJhdGlvbi5oYXNPd25Qcm9wZXJ0eSgnY29uc3RydWN0b3InKSkge1xuICAgICAgICAgICAgY29uc3RydWN0b3IgPSBkZWNsYXJhdGlvbi5jb25zdHJ1Y3RvcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yID0gZGVjbGFyYXRpb24uY29uc3RydWN0b3IgPSBmdW5jdGlvbiBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5zdGFuY2UgPSB0aGlzIGluc3RhbmNlb2YgY29uc3RydWN0b3IgPyB0aGlzIDogT2JqZWN0LmNyZWF0ZShjb25zdHJ1Y3Rvci5wcm90b3R5cGUpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLl9pbml0KSB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLl9pbml0LmFwcGx5KGluc3RhbmNlLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHByb3RvID0gY29uc3RydWN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSh0eXBlb2YgcGFyZW50ID09ICdmdW5jdGlvbicgPyBwYXJlbnQucHJvdG90eXBlIDogcGFyZW50KTtcblxuICAgICAgICBpZiAoZGVjbGFyYXRpb24uc3RhdGljKSB7XG4gICAgICAgICAgICBtaXhpbihjb25zdHJ1Y3RvciwgZGVjbGFyYXRpb24uc3RhdGljKTtcbiAgICAgICAgICAgIGRlbGV0ZSBkZWNsYXJhdGlvbi5zdGF0aWM7XG4gICAgICAgIH1cblxuICAgICAgICBtaXhpbihwcm90bywgZGVjbGFyYXRpb24pO1xuXG4gICAgICAgIGlmICghcHJvdG8uaGFzT3duUHJvcGVydHkoJ3RvU3RyaW5nJykgJiYgcHJvdG8uaGFzT3duUHJvcGVydHkoJ19fbmFtZScpKSB7XG4gICAgICAgICAgICBwcm90by50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnW29iamVjdCAnICsgdGhpcy5fX25hbWUgKyAnXSc7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNvbnN0cnVjdG9yO1xuICAgIH1cblxuICAgIGtyaW9uLmNyZWF0ZUNsYXNzID0gY3JlYXRlQ2xhc3M7XG5cbiAgICB2YXIgcmVMaXN0ZW5lck5hbWUgPSAvXl9vbltBLVpdLztcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7QXJyYXk8c3RyaW5nPn0gW25hbWVzXVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGJpbmRMaXN0ZW5lcnMoaW5zdGFuY2UsIG5hbWVzKSB7XG4gICAgICAgIGlmIChuYW1lcykge1xuICAgICAgICAgICAgbmFtZXMuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2VbbmFtZV0gPSBpbnN0YW5jZVtuYW1lXS5iaW5kKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGxpc3RlbmVycyA9IGluc3RhbmNlLmNvbnN0cnVjdG9yLl9saXN0ZW5lcnNGb3JCaW5kaW5nO1xuICAgICAgICAgICAgdmFyIG5hbWU7XG5cbiAgICAgICAgICAgIGlmICghbGlzdGVuZXJzKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzID0gaW5zdGFuY2UuY29uc3RydWN0b3IuX2xpc3RlbmVyc0ZvckJpbmRpbmcgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgICAgICAgICAgICAgZm9yIChuYW1lIGluIGluc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZUxpc3RlbmVyTmFtZS50ZXN0KG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lcnNbbmFtZV0gPSBpbnN0YW5jZVtuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChuYW1lIGluIGxpc3RlbmVycykge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlW25hbWVdID0gaW5zdGFuY2VbbmFtZV0uYmluZChpbnN0YW5jZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBrcmlvbi5iaW5kTGlzdGVuZXJzID0gYmluZExpc3RlbmVycztcblxuICAgIC8vIFJlZ0V4cCB1dGlsc1xuXG4gICAga3Jpb24ucmVnZXggPSB7fTtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZXNjYXBlUmVnRXhwKHJlKSB7XG4gICAgICAgIHJldHVybiByZS5yZXBsYWNlKC8oWz8hWytcXC1cXC5dXnx7fSg9OikkXFwvXFxcXCpdKS9nLCAnXFxcXCQxJyk7XG4gICAgfVxuXG4gICAga3Jpb24ucmVnZXguZXNjYXBlID0gZXNjYXBlO1xuXG4gICAgLy8gVGVtcGxhdGUgdXRpbHNcblxuICAgIGtyaW9uLnRtcGwgPSB7fTtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzdHJcbiAgICAgKiBAcGFyYW0ge0FycmF5fSB2YWx1ZXNcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZvcm1hdChzdHIsIHZhbHVlcykge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWVzKSkge1xuICAgICAgICAgICAgdmFsdWVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzdHIucmVwbGFjZSgvJShcXGQrKS9nLCBmdW5jdGlvbihtYXRjaCwgbnVtKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzW051bWJlcihudW0pIC0gMV07XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGtyaW9uLnRtcGwuZm9ybWF0ID0gZm9ybWF0O1xuXG4gICAgLy8gRE9NIHV0aWxzXG5cbiAgICBrcmlvbi5kb20gPSB7fTtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICAgICAqIEBwYXJhbSB7Tm9kZX0gYW5jZXN0b3JcbiAgICAgKiBAcGFyYW0ge05vZGV9IFtsaW1pdE5vZGVdXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNEZXNjZW5kYW50T2Yobm9kZSwgYW5jZXN0b3IsIGxpbWl0Tm9kZSkge1xuICAgICAgICBpZiAobGltaXROb2RlKSB7XG4gICAgICAgICAgICB3aGlsZSAobm9kZSA9IG5vZGUucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlID09IGFuY2VzdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobm9kZSA9PSBsaW1pdE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2hpbGUgKG5vZGUgPSBub2RlLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZSA9PSBhbmNlc3Rvcikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGtyaW9uLmRvbS5pc0Rlc2NlbmRhbnRPZiA9IGlzRGVzY2VuZGFudE9mO1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtOb2RlfSBub2RlXG4gICAgICogQHBhcmFtIHtOb2RlfSBhbmNlc3RvclxuICAgICAqIEBwYXJhbSB7Tm9kZX0gW2xpbWl0Tm9kZV1cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc1NlbGZPckRlc2NlbmRhbnRPZihub2RlLCBhbmNlc3RvciwgbGltaXROb2RlKSB7XG4gICAgICAgIHJldHVybiBub2RlID09IGFuY2VzdG9yIHx8IGlzRGVzY2VuZGFudE9mKG5vZGUsIGFuY2VzdG9yLCBsaW1pdE5vZGUpO1xuICAgIH1cblxuICAgIGtyaW9uLmRvbS5pc1NlbGZPckRlc2NlbmRhbnRPZiA9IGlzU2VsZk9yRGVzY2VuZGFudE9mO1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRhZ05hbWVcbiAgICAgKiBAcGFyYW0ge09iamVjdDxzdHJpbmc+fSBbYXR0cmlidXRlc11cbiAgICAgKiBAcGFyYW0ge0FycmF5PE5vZGV8c3RyaW5nPnxIVE1MRWxlbWVudHxEb2N1bWVudEZyYWdtZW50fSBbc3Vibm9kZXNdXG4gICAgICogQHJldHVybnMge0hUTUxFbGVtZW50fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQodGFnTmFtZSwgYXR0cmlidXRlcywgc3Vibm9kZXMpIHtcbiAgICAgICAgcmV0dXJuIHNldEVsZW1lbnQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKSwgYXR0cmlidXRlcywgc3Vibm9kZXMpO1xuICAgIH1cblxuICAgIGtyaW9uLmRvbS5jcmVhdGVFbGVtZW50ID0gY3JlYXRlRWxlbWVudDtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sXG4gICAgICogQHBhcmFtIHtBcnJheX0gW3ZhbHVlc11cbiAgICAgKiBAcmV0dXJucyB7SFRNTEVsZW1lbnR9XG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlRWxlbWVudEZyb21IVE1MKGh0bWwsIHZhbHVlcykge1xuICAgICAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZXMpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaHRtbCA9IGZvcm1hdChodG1sLCB2YWx1ZXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgZWwuaW5uZXJIVE1MID0gaHRtbDtcblxuICAgICAgICByZXR1cm4gZWwuY2hpbGROb2Rlcy5sZW5ndGggPT0gMSAmJiBlbC5maXJzdENoaWxkLm5vZGVUeXBlID09IDEgPyBlbC5maXJzdENoaWxkIDogZWw7XG4gICAgfVxuXG4gICAga3Jpb24uZG9tLmNyZWF0ZUVsZW1lbnRGcm9tSFRNTCA9IGNyZWF0ZUVsZW1lbnRGcm9tSFRNTDtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsXG4gICAgICogQHBhcmFtIHtPYmplY3Q8c3RyaW5nPn0gW2F0dHJpYnV0ZXNdXG4gICAgICogQHBhcmFtIHtBcnJheTxOb2RlfHN0cmluZz58SFRNTEVsZW1lbnR8RG9jdW1lbnRGcmFnbWVudH0gW3N1Ym5vZGVzXVxuICAgICAqIEByZXR1cm5zIHtIVE1MRWxlbWVudH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzZXRFbGVtZW50KGVsLCBhdHRyaWJ1dGVzLCBzdWJub2Rlcykge1xuICAgICAgICBpZiAoYXR0cmlidXRlcyAhPSBudWxsKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhhdHRyaWJ1dGVzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUobmFtZSwgYXR0cmlidXRlc1tuYW1lXSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdWJub2RlcyAhPSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShzdWJub2RlcykpIHtcbiAgICAgICAgICAgICAgICBzdWJub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKHN1Ym5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuYXBwZW5kQ2hpbGQodHlwZW9mIHN1Ym5vZGUgPT0gJ3N0cmluZycgPyBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdWJub2RlKSA6IHN1Ym5vZGUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHN1Ym5vZGVzLm5vZGVUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTogLy8gRUxFTUVOVF9OT0RFXG4gICAgICAgICAgICAgICAgICAgICAgICBtb3ZlQ2hpbGRyZW4oc3Vibm9kZXMsIGVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDExOiAvLyBET0NVTUVOVF9GUkFHTUVOVF9OT0RFXG4gICAgICAgICAgICAgICAgICAgICAgICBlbC5hcHBlbmRDaGlsZChzdWJub2Rlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZWw7XG4gICAgfVxuXG4gICAga3Jpb24uZG9tLnNldEVsZW1lbnQgPSBzZXRFbGVtZW50O1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtOb2RlfSBub2RlXG4gICAgICogQHBhcmFtIHtOb2RlfSB0YXJnZXRcbiAgICAgKiBAcmV0dXJucyB7Tm9kZX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBtb3ZlQ2hpbGRyZW4obm9kZSwgdGFyZ2V0KSB7XG4gICAgICAgIGlmIChub2RlICE9IHRhcmdldCkge1xuICAgICAgICAgICAgd2hpbGUgKG5vZGUuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgIHRhcmdldC5hcHBlbmRDaGlsZChub2RlLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfVxuXG4gICAga3Jpb24uZG9tLm1vdmVDaGlsZHJlbiA9IG1vdmVDaGlsZHJlbjtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICAgICAqIEByZXR1cm5zIHtOb2RlfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlbW92ZU5vZGUobm9kZSkge1xuICAgICAgICBpZiAobm9kZS5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICBub2RlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuXG4gICAga3Jpb24uZG9tLnJlbW92ZU5vZGUgPSByZW1vdmVOb2RlO1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHVybFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gYWRkU2NyaXB0KHVybCwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuXG4gICAgICAgIHNjcmlwdC5zcmMgPSB1cmw7XG4gICAgICAgIHNjcmlwdC5hc3luYyA9IHRydWU7XG5cbiAgICAgICAgc2NyaXB0Lm9ubG9hZCA9IHNjcmlwdC5vbmVycm9yID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICBzY3JpcHQub25sb2FkID0gc2NyaXB0Lm9uZXJyb3IgPSBudWxsO1xuXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGV2dC50eXBlID09ICdsb2FkJyk7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgfTtcblxuICAgICAgICAoZG9jdW1lbnQuaGVhZCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpLmFwcGVuZENoaWxkKHNjcmlwdCk7XG4gICAgfVxuXG4gICAga3Jpb24uZG9tLmFkZFNjcmlwdCA9IGFkZFNjcmlwdDtcblxuICAgIC8vIEFKQVggdXRpbHNcblxuICAgIGtyaW9uLmFqYXggPSB7fTtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1cmxcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdGlvbnMuY2FsbGJhY2tLZXk9J2NhbGxiYWNrJ11cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdGlvbnMuY2FsbGJhY2tOYW1lXVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMucHJldmVudENhY2hpbmc9dHJ1ZV1cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmNhY2hpbmdQcmV2ZW50aW9uS2V5PSdfciddXG4gICAgICogQHBhcmFtIHtpbnR9IFtvcHRpb25zLnRpbWVvdXQ9MzAwMDBdXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW29wdGlvbnMub25GYWlsdXJlXVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGpzb25wKHVybCwgY2FsbGJhY2ssIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMgPT0gbnVsbCkge1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFvcHRpb25zLmNhbGxiYWNrS2V5KSB7IG9wdGlvbnMuY2FsbGJhY2tLZXkgPSAnY2FsbGJhY2snOyB9XG4gICAgICAgIGlmICghb3B0aW9ucy5jYWxsYmFja05hbWUpIHsgb3B0aW9ucy5jYWxsYmFja05hbWUgPSAnX19jYWxsYmFjaycgKyBuZXh0VUlEKCk7IH1cbiAgICAgICAgaWYgKG9wdGlvbnMucHJldmVudENhY2hpbmcgPT09IHVuZGVmaW5lZCkgeyBvcHRpb25zLnByZXZlbnRDYWNoaW5nID0gdHJ1ZTsgfVxuICAgICAgICBpZiAoIW9wdGlvbnMuY2FjaGluZ1ByZXZlbnRpb25LZXkpIHsgb3B0aW9ucy5jYWNoaW5nUHJldmVudGlvbktleSA9ICdfcic7IH1cbiAgICAgICAgaWYgKCFvcHRpb25zLnRpbWVvdXQpIHsgb3B0aW9ucy50aW1lb3V0ID0gMzAwMDA7IH1cblxuICAgICAgICB2YXIgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG5cbiAgICAgICAgc2NyaXB0LnNyYyA9IHVybCArICh1cmwuaW5kZXhPZignPycpICE9IC0xID8gJyYnIDogJz8nKSArIG9wdGlvbnMuY2FsbGJhY2tLZXkgKyAnPScgKyBvcHRpb25zLmNhbGxiYWNrTmFtZSArXG4gICAgICAgICAgICAob3B0aW9ucy5wcmV2ZW50Q2FjaGluZyA/ICcmJyArIG9wdGlvbnMuY2FjaGluZ1ByZXZlbnRpb25LZXkgKyAnPScgKyBNYXRoLnJhbmRvbSgpIDogJycpO1xuICAgICAgICBzY3JpcHQuYXN5bmMgPSB0cnVlO1xuXG4gICAgICAgIHNjcmlwdC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjbGVhcigpO1xuXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5vbkZhaWx1cmUpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLm9uRmFpbHVyZS5jYWxsKHdpbmRvdyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgd2luZG93W29wdGlvbnMuY2FsbGJhY2tOYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2xlYXIoKTtcbiAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHRpbWVySWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2xlYXIoKTtcblxuICAgICAgICAgICAgaWYgKG9wdGlvbnMub25GYWlsdXJlKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5vbkZhaWx1cmUuY2FsbCh3aW5kb3cpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBvcHRpb25zLnRpbWVvdXQpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNsZWFyKCkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVySWQpO1xuICAgICAgICAgICAgZGVsZXRlIHdpbmRvd1tvcHRpb25zLmNhbGxiYWNrTmFtZV07XG4gICAgICAgICAgICBzY3JpcHQub25lcnJvciA9IG51bGw7XG4gICAgICAgICAgICBzY3JpcHQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzY3JpcHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgKGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KS5hcHBlbmRDaGlsZChzY3JpcHQpO1xuICAgIH1cblxuICAgIGtyaW9uLmFqYXguanNvbnAgPSBqc29ucDtcblxuICAgIC8vIEVtaXR0ZXJcblxuICAgIHZhciBFbWl0dGVyID0ga3Jpb24uRW1pdHRlciA9IGNyZWF0ZUNsYXNzKHtcbiAgICAgICAgX19uYW1lOiAna3Jpb24uRW1pdHRlcicsXG5cbiAgICAgICAgX2V2ZW50czogbnVsbCxcblxuICAgICAgICBfbGlzdGVuaW5nVG86IG51bGwsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbY29udGV4dF1cbiAgICAgICAgICogQHJldHVybnMge2tyaW9uLkVtaXR0ZXJ9XG4gICAgICAgICAqL1xuICAgICAgICBvbjogZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHMgfHwgKHRoaXMuX2V2ZW50cyA9IE9iamVjdC5jcmVhdGUobnVsbCkpO1xuXG4gICAgICAgICAgICAoZXZlbnRzW3R5cGVdIHx8IChldmVudHNbdHlwZV0gPSBbXSkpLnB1c2goe1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyOiBsaXN0ZW5lcixcbiAgICAgICAgICAgICAgICBjb250ZXh0OiBjb250ZXh0XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbdHlwZV1cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2xpc3RlbmVyXVxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbnRleHRdXG4gICAgICAgICAqIEByZXR1cm5zIHtrcmlvbi5FbWl0dGVyfVxuICAgICAgICAgKi9cbiAgICAgICAgb2ZmOiBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lciwgY29udGV4dCkge1xuICAgICAgICAgICAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50cztcblxuICAgICAgICAgICAgaWYgKCFldmVudHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHR5cGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHZhciB0eXBlcyA9IE9iamVjdC5rZXlzKGV2ZW50cyk7XG4gICAgICAgICAgICAgICAgdmFyIGkgPSB0eXBlcy5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICB3aGlsZSAoaSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9mZih0eXBlc1stLWldLCBsaXN0ZW5lciwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGV2ZW50cyA9IGV2ZW50c1t0eXBlXTtcblxuICAgICAgICAgICAgaWYgKGV2ZW50cykge1xuICAgICAgICAgICAgICAgIHZhciBpID0gZXZlbnRzLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgIHdoaWxlIChpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBldmVudCA9IGV2ZW50c1stLWldO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICAgICAgICAgIChsaXN0ZW5lciA9PT0gdW5kZWZpbmVkIHx8IGxpc3RlbmVyID09IGV2ZW50Lmxpc3RlbmVyIHx8IGxpc3RlbmVyID09IGV2ZW50Lmxpc3RlbmVyLl9pbm5lcikgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0ID09IGV2ZW50LmNvbnRleHRcbiAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudHMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCFldmVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXJcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IFtjb250ZXh0XVxuICAgICAgICAgKiBAcmV0dXJucyB7a3Jpb24uRW1pdHRlcn1cbiAgICAgICAgICovXG4gICAgICAgIG9uY2U6IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyLCBjb250ZXh0KSB7XG4gICAgICAgICAgICBmdW5jdGlvbiB3cmFwcGVyKCkge1xuICAgICAgICAgICAgICAgIHRoaXMub2ZmKHR5cGUsIHdyYXBwZXIpO1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3cmFwcGVyLl9pbm5lciA9IGxpc3RlbmVyO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vbih0eXBlLCB3cmFwcGVyLCBjb250ZXh0KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAgICAgICAgICogQHBhcmFtIHsqfSAuLi5hcmdzXG4gICAgICAgICAqIEByZXR1cm5zIHtrcmlvbi5FbWl0dGVyfVxuICAgICAgICAgKi9cbiAgICAgICAgZW1pdDogZnVuY3Rpb24odHlwZSkge1xuICAgICAgICAgICAgdmFyIGV2ZW50cyA9ICh0aGlzLl9ldmVudHMgfHwgKHRoaXMuX2V2ZW50cyA9IE9iamVjdC5jcmVhdGUobnVsbCkpKVt0eXBlXTtcblxuICAgICAgICAgICAgaWYgKGV2ZW50cykge1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gZXZlbnRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBldmVudHNbaV0ubGlzdGVuZXIuYXBwbHkoZXZlbnRzW2ldLmNvbnRleHQgfHwgdGhpcywgYXJncyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IHRhcmdldFxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lclxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbnRleHRdXG4gICAgICAgICAqIEByZXR1cm5zIHtrcmlvbi5FbWl0dGVyfVxuICAgICAgICAgKi9cbiAgICAgICAgbGlzdGVuVG86IGZ1bmN0aW9uKHRhcmdldCwgdHlwZSwgbGlzdGVuZXIsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIHZhciBsaXN0ZW5pbmdUbyA9IHRoaXMuX2xpc3RlbmluZ1RvIHx8ICh0aGlzLl9saXN0ZW5pbmdUbyA9IE9iamVjdC5jcmVhdGUobnVsbCkpO1xuICAgICAgICAgICAgdmFyIGlkID0gZ2V0VUlEKHRhcmdldCkgKyAnLScgKyB0eXBlICsgJy0nICsgZ2V0VUlEKGxpc3RlbmVyKSArIChjb250ZXh0ID8gZ2V0VUlEKGNvbnRleHQpIDogJzAnKTtcblxuICAgICAgICAgICAgaWYgKCEoaWQgaW4gbGlzdGVuaW5nVG8pKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuaW5nVG9baWRdID0ge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6IHRhcmdldCxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXI6IGxpc3RlbmVyLFxuICAgICAgICAgICAgICAgICAgICBjb250ZXh0OiBjb250ZXh0XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGlmICh0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHdyYXBwZXIgPSBsaXN0ZW5pbmdUb1tpZF0ud3JhcHBlciA9IGxpc3RlbmVyLmJpbmQoY29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB3cmFwcGVyLl9pbm5lciA9IGxpc3RlbmVyO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCB3cmFwcGVyKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC5vbih0eXBlLCBsaXN0ZW5lciwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IHRhcmdldFxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lclxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbnRleHRdXG4gICAgICAgICAqIEByZXR1cm5zIHtrcmlvbi5FbWl0dGVyfVxuICAgICAgICAgKi9cbiAgICAgICAgc3RvcExpc3RlbmluZzogZnVuY3Rpb24odGFyZ2V0LCB0eXBlLCBsaXN0ZW5lciwgY29udGV4dCkge1xuICAgICAgICAgICAgdmFyIGxpc3RlbmluZ1RvID0gdGhpcy5fbGlzdGVuaW5nVG8gfHwgKHRoaXMuX2xpc3RlbmluZ1RvID0gT2JqZWN0LmNyZWF0ZShudWxsKSk7XG5cbiAgICAgICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlkID0gZ2V0VUlEKHRhcmdldCkgKyAnLScgKyB0eXBlICsgJy0nICsgZ2V0VUlEKGxpc3RlbmVyKSArIChjb250ZXh0ID8gZ2V0VUlEKGNvbnRleHQpIDogJzAnKTtcblxuICAgICAgICAgICAgICAgIGlmIChpZCBpbiBsaXN0ZW5pbmdUbykge1xuICAgICAgICAgICAgICAgICAgICByZW1vdmVMaXN0ZW5lcihsaXN0ZW5pbmdUb1tpZF0pO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgbGlzdGVuaW5nVG9baWRdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaWQgaW4gbGlzdGVuaW5nVG8pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlTGlzdGVuZXIobGlzdGVuaW5nVG9baWRdKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGxpc3RlbmluZ1RvW2lkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lcihldmVudCkge1xuICAgICAgICBpZiAoZXZlbnQudGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgICAgIGV2ZW50LnRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LnR5cGUsIGV2ZW50LmNvbnRleHQgPyBldmVudC53cmFwcGVyIDogZXZlbnQubGlzdGVuZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXZlbnQudGFyZ2V0Lm9mZihldmVudC50eXBlLCBldmVudC5saXN0ZW5lciwgZXZlbnQuY29udGV4dCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGV4cG9ydHMgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtb2R1bGUgIT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgICAgIG1vZHVsZS5leHBvcnRzID0ga3Jpb247XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBleHBvcnRzLmtyaW9uID0ga3Jpb247XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICB3aW5kb3cua3Jpb24gPSBrcmlvbjtcbiAgICB9XG5cbn0pKCk7XG4iXX0=
