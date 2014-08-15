(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

var krion = require('./krion/krion');

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
            heatmapLayers[materialName] = new HeatmapOverlay(
                krion.object.assign(Object.create(heatmapLayerConf), {
                    gradient: {
                        0: 'rgba(0,0,0,0)',
                        1: materials[materialName].color
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9kLnZpYmUvMmdpcy8yZ2lzLW1hdGVyaWFscy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZC52aWJlLzJnaXMvMmdpcy1tYXRlcmlhbHMvc2NyaXB0cy9mYWtlXzcyMTc3NTQuanMiLCIvVXNlcnMvZC52aWJlLzJnaXMvMmdpcy1tYXRlcmlhbHMvc2NyaXB0cy9rcmlvbi9rcmlvbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0WEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG52YXIga3Jpb24gPSByZXF1aXJlKCcuL2tyaW9uL2tyaW9uJyk7XG5cbnZhciBtYXRlcmlhbHMgPSB7XG4gICAgJ9CU0LXRgNC10LLQvic6IHsgY29sb3I6ICcjYjQ3ZTRkJywgZW5OYW1lOiAnd29vZCcgfSxcbiAgICAn0JrQuNGA0L/QuNGHJzogeyBjb2xvcjogJyNmZjY0NjQnLCBlbk5hbWU6ICdicmljaycgfSxcbiAgICAn0J/QsNC90LXQu9GMJzogeyBjb2xvcjogJyMwMDg5NjUnLCBlbk5hbWU6ICdwYW5lbCcgfSxcbiAgICAn0JHQtdGC0L7QvSc6IHsgY29sb3I6ICcjYTA0MDg5JywgZW5OYW1lOiAnY29uY3JldGUnIH0sXG4gICAgJ9Cc0LXRgtCw0LvQuyc6IHsgY29sb3I6ICcjMDA4OGZmJywgZW5OYW1lOiAnbWV0YWwnIH1cbn07XG5cbnZhciBoZWF0bWFwTGF5ZXJDb25mID0ge1xuICAgIC8vIHJhZGl1cyBzaG91bGQgYmUgc21hbGwgT05MWSBpZiBzY2FsZVJhZGl1cyBpcyB0cnVlIChvciBzbWFsbCByYWRpdXMgaXMgaW50ZW5kZWQpXG4gICAgLy8gaWYgc2NhbGVSYWRpdXMgaXMgZmFsc2UgaXQgd2lsbCBiZSB0aGUgY29uc3RhbnQgcmFkaXVzIHVzZWQgaW4gcGl4ZWxzXG4gICAgcmFkaXVzOiAwLjAwMDUsXG5cbiAgICBtYXhPcGFjaXR5OiAwLjcsXG5cbiAgICAvLyBzY2FsZXMgdGhlIHJhZGl1cyBiYXNlZCBvbiBtYXAgem9vbVxuICAgIHNjYWxlUmFkaXVzOiB0cnVlLFxuXG4gICAgYmx1cjogMS4wLFxuXG4gICAgLy8gaWYgc2V0IHRvIGZhbHNlIHRoZSBoZWF0bWFwIHVzZXMgdGhlIGdsb2JhbCBtYXhpbXVtIGZvciBjb2xvcml6YXRpb25cbiAgICAvLyBpZiBhY3RpdmF0ZWQ6IHVzZXMgdGhlIGRhdGEgbWF4aW11bSB3aXRoaW4gdGhlIGN1cnJlbnQgbWFwIGJvdW5kYXJpZXNcbiAgICAvLyAgICh0aGVyZSB3aWxsIGFsd2F5cyBiZSBhIHJlZCBzcG90IHdpdGggdXNlTG9jYWxFeHRyZW1hcyB0cnVlKVxuICAgIHVzZUxvY2FsRXh0cmVtYTogdHJ1ZSxcblxuICAgIGxhdEZpZWxkOiAnbGF0JyxcbiAgICBsbmdGaWVsZDogJ2xuZycsXG4gICAgdmFsdWVGaWVsZDogJ2NvdW50J1xufTtcblxudmFyIE1hdGVyaWFsc0FwcCA9IGtyaW9uLmNyZWF0ZUNsYXNzKGtyaW9uLkVtaXR0ZXIsIHtcbiAgICBfX25hbWU6ICdNYXRlcmlhbHNBcHAnLFxuXG4gICAgX2NpdGllczogbnVsbCxcbiAgICBfc2VsZWN0ZWRDaXR5VHJhbnNsaXRlcmF0ZWROYW1lOiBudWxsLFxuXG4gICAgX21hdGVyaWFsRGF0YUxvYWRpbmdFbWl0dGVyOiBudWxsLFxuXG4gICAgX2NpdHlMaXN0SXNTaG93bjogZmFsc2UsXG5cbiAgICBfbWFwOiBudWxsLFxuXG4gICAgX2hlYXRtYXBMYXllcnM6IG51bGwsXG5cbiAgICBlbGVtZW50OiBudWxsLFxuICAgIF9iTWFwOiBudWxsLFxuICAgIF90ZkNpdHk6IG51bGwsXG4gICAgX2JNYXRlcmlhbHM6IG51bGwsXG4gICAgX2JjTWF0ZXJpYWxPcHRpb25zOiBudWxsLFxuICAgIF9iQ2l0eUxpc3Q6IG51bGwsXG4gICAgX2JjQ2l0eUxpc3RMaW5rczogbnVsbCxcbiAgICBfYnRuUmVhZE1vcmU6IG51bGwsXG5cbiAgICBfaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGtyaW9uLmJpbmRMaXN0ZW5lcnModGhpcyk7XG5cbiAgICAgICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuYm9keTtcblxuICAgICAgICBERy50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5fZmluZEJsb2NrcygpO1xuXG4gICAgICAgICAgICB0aGlzLl9tYXAgPSBERy5tYXAodGhpcy5fYk1hcCwge1xuICAgICAgICAgICAgICAgICdjZW50ZXInOiBbNTQuOTgsIDgyLjg5XSxcbiAgICAgICAgICAgICAgICAnem9vbSc6IDEzXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5fbG9hZFNjcmlwdHMoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY3JlYXRlSGVhdG1hcExheWVycygpO1xuXG4gICAgICAgICAgICAgICAga3Jpb24uYWpheC5qc29ucCgnZGF0YS9jaXRpZXMvaW5kZXguanNvbnAnLCBmdW5jdGlvbihjaXRpZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fY2l0aWVzID0gY2l0aWVzLnJlZHVjZShmdW5jdGlvbihjaXRpZXMsIGNpdHlEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaXRpZXNbY2l0eURhdGEudHJhbnNsaXRlcmF0ZWROYW1lXSA9IGNpdHlEYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNpdGllcztcbiAgICAgICAgICAgICAgICAgICAgfSwge30pO1xuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZVRGQ2l0eUFuZEJDaXR5TGlzdCgnTm92b3N5Ynlyc2snKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fdXBkYXRlQk1hdGVyaWFscygpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9iaW5kTGlzdGVuZXJzKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2xvYWRNYXRlcmlhbERhdGEodGhpcy5fc2VsZWN0ZWRDaXR5VHJhbnNsaXRlcmF0ZWROYW1lLCB0aGlzLl91cGRhdGVIZWF0bWFwTGF5ZXJzKTtcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcyksIHsgY2FsbGJhY2tOYW1lOiAnX3NldERhdGEnIH0pO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICB9LFxuXG4gICAgX2ZpbmRCbG9ja3M6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZWwgPSB0aGlzLmVsZW1lbnQ7XG5cbiAgICAgICAgdGhpcy5fYk1hcCA9IGVsLnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLW5hbWU9Yk1hcF0nKTtcbiAgICAgICAgdGhpcy5fdGZDaXR5ID0gZWwucXVlcnlTZWxlY3RvcignW2RhdGEtbmFtZT10ZkNpdHldJyk7XG4gICAgICAgIHRoaXMuX2JNYXRlcmlhbHMgPSBlbC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1uYW1lPWJNYXRlcmlhbHNdJyk7XG4gICAgICAgIHRoaXMuX2JDaXR5TGlzdCA9IGVsLnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLW5hbWU9YkNpdHlMaXN0XScpO1xuICAgICAgICB0aGlzLl9idG5SZWFkTW9yZSA9IGVsLnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLW5hbWU9YnRuUmVhZE1vcmVdJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICovXG4gICAgX2xvYWRTY3JpcHRzOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICBrcmlvbi5kb20uYWRkU2NyaXB0KCdub2RlX21vZHVsZXMvaGVhdG1hcC5qcy9idWlsZC9oZWF0bWFwLmpzJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBrcmlvbi5kb20uYWRkU2NyaXB0KCdub2RlX21vZHVsZXMvaGVhdG1hcC5qcy9wbHVnaW5zL2xlYWZsZXQtaGVhdG1hcC5qcycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwodGhpcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIF9jcmVhdGVIZWF0bWFwTGF5ZXJzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5faGVhdG1hcExheWVycyA9IE9iamVjdC5rZXlzKG1hdGVyaWFscykucmVkdWNlKGZ1bmN0aW9uKGhlYXRtYXBMYXllcnMsIG1hdGVyaWFsTmFtZSkge1xuICAgICAgICAgICAgaGVhdG1hcExheWVyc1ttYXRlcmlhbE5hbWVdID0gbmV3IEhlYXRtYXBPdmVybGF5KFxuICAgICAgICAgICAgICAgIGtyaW9uLm9iamVjdC5hc3NpZ24oT2JqZWN0LmNyZWF0ZShoZWF0bWFwTGF5ZXJDb25mKSwge1xuICAgICAgICAgICAgICAgICAgICBncmFkaWVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgMDogJ3JnYmEoMCwwLDAsMCknLFxuICAgICAgICAgICAgICAgICAgICAgICAgMTogbWF0ZXJpYWxzW21hdGVyaWFsTmFtZV0uY29sb3JcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICByZXR1cm4gaGVhdG1hcExheWVycztcbiAgICAgICAgfSwge30pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3NlbGVjdGVkQ2l0eVRyYW5zbGl0ZXJhdGVkTmFtZV1cbiAgICAgKi9cbiAgICBfdXBkYXRlVEZDaXR5QW5kQkNpdHlMaXN0OiBmdW5jdGlvbihzZWxlY3RlZENpdHlUcmFuc2xpdGVyYXRlZE5hbWUpIHtcbiAgICAgICAgdmFyIGJDaXR5TGlzdCA9IHRoaXMuX2JDaXR5TGlzdDtcbiAgICAgICAgdmFyIGJjQ2l0eUxpc3RMaW5rcyA9IHRoaXMuX2JjQ2l0eUxpc3RMaW5rcyA9IHt9O1xuXG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMuX2NpdGllcykuZm9yRWFjaChmdW5jdGlvbihjaXR5VHJhbnNsaXRlcmF0ZWROYW1lKSB7XG4gICAgICAgICAgICB2YXIgY2l0eURhdGEgPSB0aGlzLl9jaXRpZXNbY2l0eVRyYW5zbGl0ZXJhdGVkTmFtZV07XG5cbiAgICAgICAgICAgIHZhciBsaW5rID0ga3Jpb24uZG9tLmNyZWF0ZUVsZW1lbnRGcm9tSFRNTChcbiAgICAgICAgICAgICAgICAnPGEgZGF0YS10cmFuc2xpdGVyYXRlZC1uYW1lPVwiJTFcIiBocmVmPVwiIyUxXCI+JTI8L2E+JyxcbiAgICAgICAgICAgICAgICBjaXR5VHJhbnNsaXRlcmF0ZWROYW1lLFxuICAgICAgICAgICAgICAgIGNpdHlEYXRhLm5hbWVcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHZhciBsaSA9IGtyaW9uLmRvbS5jcmVhdGVFbGVtZW50KCdsaScsIG51bGwsIFtsaW5rXSk7XG5cbiAgICAgICAgICAgIGJjQ2l0eUxpc3RMaW5rc1tjaXR5VHJhbnNsaXRlcmF0ZWROYW1lXSA9IGxpbms7XG4gICAgICAgICAgICBiQ2l0eUxpc3QuYXBwZW5kQ2hpbGQobGkpO1xuICAgICAgICB9LCB0aGlzKTtcblxuICAgICAgICBpZiAoc2VsZWN0ZWRDaXR5VHJhbnNsaXRlcmF0ZWROYW1lKSB7XG4gICAgICAgICAgICB0aGlzLl9zZXRDaXR5SW5Db250cm9sUGFuZWwoc2VsZWN0ZWRDaXR5VHJhbnNsaXRlcmF0ZWROYW1lKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHJhbnNsaXRlcmF0ZWRDaXR5TmFtZVxuICAgICAqL1xuICAgIF9zZXRDaXR5SW5Db250cm9sUGFuZWw6IGZ1bmN0aW9uKHRyYW5zbGl0ZXJhdGVkQ2l0eU5hbWUpIHtcbiAgICAgICAgdmFyIGNpdHlEYXRhID0gdGhpcy5fY2l0aWVzW3RyYW5zbGl0ZXJhdGVkQ2l0eU5hbWVdO1xuXG4gICAgICAgIGlmICh0aGlzLl9zZWxlY3RlZENpdHlUcmFuc2xpdGVyYXRlZE5hbWUpIHtcbiAgICAgICAgICAgIHRoaXMuX3RmQ2l0eS5jbGFzc0xpc3QucmVtb3ZlKCdfY2l0eS0nICsgdGhpcy5fc2VsZWN0ZWRDaXR5VHJhbnNsaXRlcmF0ZWROYW1lKTtcbiAgICAgICAgICAgIHRoaXMuX2JjQ2l0eUxpc3RMaW5rc1t0aGlzLl9zZWxlY3RlZENpdHlUcmFuc2xpdGVyYXRlZE5hbWVdLmNsYXNzTGlzdC5yZW1vdmUoJ19zZWxlY3RlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fc2VsZWN0ZWRDaXR5VHJhbnNsaXRlcmF0ZWROYW1lID0gdHJhbnNsaXRlcmF0ZWRDaXR5TmFtZTtcblxuICAgICAgICB0aGlzLl90ZkNpdHkuY2xhc3NMaXN0LmFkZCgnX2NpdHktJyArIHRyYW5zbGl0ZXJhdGVkQ2l0eU5hbWUpO1xuICAgICAgICB0aGlzLl90ZkNpdHkubGFzdEVsZW1lbnRDaGlsZC5pbm5lckhUTUwgPSBjaXR5RGF0YS5uYW1lO1xuICAgICAgICB0aGlzLl9iY0NpdHlMaXN0TGlua3NbdHJhbnNsaXRlcmF0ZWRDaXR5TmFtZV0uY2xhc3NMaXN0LmFkZCgnX3NlbGVjdGVkJyk7XG4gICAgfSxcblxuICAgIF91cGRhdGVCTWF0ZXJpYWxzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGJNYXRlcmlhbHMgPSB0aGlzLl9iTWF0ZXJpYWxzO1xuXG4gICAgICAgIHRoaXMuX2JjTWF0ZXJpYWxPcHRpb25zID0gT2JqZWN0LmtleXMobWF0ZXJpYWxzKS5yZWR1Y2UoZnVuY3Rpb24oYmNNYXRlcmlhbE9wdGlvbnMsIG1hdGVyaWFsTmFtZSkge1xuICAgICAgICAgICAgdmFyIGxhYmVsID0ga3Jpb24uZG9tLmNyZWF0ZUVsZW1lbnRGcm9tSFRNTChcbiAgICAgICAgICAgICAgICAnPGxhYmVsIGNsYXNzPVwiY2hiIF9tYXRlcmlhbC0lMVwiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjaGVja2VkPVwiY2hlY2tlZFwiIC8+PHNwYW4+PC9zcGFuPiUyPC9sYWJlbD4nLFxuICAgICAgICAgICAgICAgIG1hdGVyaWFsc1ttYXRlcmlhbE5hbWVdLmVuTmFtZSxcbiAgICAgICAgICAgICAgICBtYXRlcmlhbE5hbWVcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGJjTWF0ZXJpYWxPcHRpb25zW21hdGVyaWFsTmFtZV0gPSBsYWJlbC5maXJzdENoaWxkO1xuICAgICAgICAgICAgYk1hdGVyaWFscy5hcHBlbmRDaGlsZChsYWJlbCk7XG5cbiAgICAgICAgICAgIHJldHVybiBiY01hdGVyaWFsT3B0aW9ucztcbiAgICAgICAgfSwge30pO1xuICAgIH0sXG5cbiAgICBfYmluZExpc3RlbmVyczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5fdGZDaXR5LCAnY2xpY2snLCB0aGlzLl9vblRGQ2l0eUNsaWNrKTtcblxuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuX2JDaXR5TGlzdCwgJ2NsaWNrJywgdGhpcy5fb25CQ2l0eUxpc3RDbGljayk7XG5cbiAgICAgICAgT2JqZWN0LmtleXModGhpcy5fYmNNYXRlcmlhbE9wdGlvbnMpLmZvckVhY2goZnVuY3Rpb24obWF0ZXJpYWxOYW1lKSB7XG4gICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuX2JjTWF0ZXJpYWxPcHRpb25zW21hdGVyaWFsTmFtZV0sICdjaGFuZ2UnLCB0aGlzLl9vbkJDTWF0ZXJpYWxPcHRpb25zQ2hhbmdlKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7TW91c2VFdmVudH0gZXZ0XG4gICAgICovXG4gICAgX29uVEZDaXR5Q2xpY2s6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICB0aGlzLnRvb2dsZUNpdHlMaXN0KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7TW91c2VFdmVudH0gZXZ0XG4gICAgICovXG4gICAgX29uQkNpdHlMaXN0Q2xpY2s6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGxpbms7XG4gICAgICAgICAgICB2YXIgbm9kZSA9IGV2dC50YXJnZXQ7XG5cbiAgICAgICAgICAgIHdoaWxlIChub2RlICE9IHRoaXMuX2JDaXR5TGlzdCkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlLnRhZ05hbWUgPT0gJ0EnKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpbmsgPSBub2RlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWxpbmspIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciB0cmFuc2xpdGVyYXRlZENpdHlOYW1lID0gbGluay5kYXRhc2V0LnRyYW5zbGl0ZXJhdGVkTmFtZTtcblxuICAgICAgICAgICAgdGhpcy5fc2V0Q2l0eUluQ29udHJvbFBhbmVsKHRyYW5zbGl0ZXJhdGVkQ2l0eU5hbWUpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5fY2l0aWVzW3RyYW5zbGl0ZXJhdGVkQ2l0eU5hbWVdLm1hdGVyaWFsRGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbG9hZE1hdGVyaWFsRGF0YSh0cmFuc2xpdGVyYXRlZENpdHlOYW1lLCB0aGlzLl91cGRhdGVIZWF0bWFwTGF5ZXJzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fdXBkYXRlSGVhdG1hcExheWVycygpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmhpZGVDaXR5TGlzdCgpO1xuICAgICAgICB9LmJpbmQodGhpcyksIDEpO1xuICAgIH0sXG5cbiAgICBfb25CQ01hdGVyaWFsT3B0aW9uc0NoYW5nZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLl91cGRhdGVIZWF0bWFwTGF5ZXJzKCk7XG4gICAgICAgIH0uYmluZCh0aGlzKSwgMSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0cmFuc2xpdGVyYXRlZENpdHlOYW1lXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBfbG9hZE1hdGVyaWFsRGF0YTogZnVuY3Rpb24odHJhbnNsaXRlcmF0ZWRDaXR5TmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGNpdHlEYXRhID0gdGhpcy5fY2l0aWVzW3RyYW5zbGl0ZXJhdGVkQ2l0eU5hbWVdO1xuXG4gICAgICAgIGlmIChjaXR5RGF0YS5tYXRlcmlhbERhdGEpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwodGhpcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbG9hZGluZ0VtaXR0ZXIgPSB0aGlzLl9tYXRlcmlhbERhdGFMb2FkaW5nRW1pdHRlciB8fFxuICAgICAgICAgICAgKHRoaXMuX21hdGVyaWFsRGF0YUxvYWRpbmdFbWl0dGVyID0gbmV3IGtyaW9uLkVtaXR0ZXIoKSk7XG5cbiAgICAgICAgbG9hZGluZ0VtaXR0ZXIub25jZSgnbG9hZGVkOicgKyB0cmFuc2xpdGVyYXRlZENpdHlOYW1lLCBjYWxsYmFjaywgdGhpcyk7XG5cbiAgICAgICAgaWYgKGNpdHlEYXRhLmxvYWRpbmdNYXRlcmlhbERhdGEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNpdHlEYXRhLmxvYWRpbmdNYXRlcmlhbERhdGEgPSB0cnVlO1xuXG4gICAgICAgIGtyaW9uLmFqYXguanNvbnAoXG4gICAgICAgICAgICAnZGF0YS9jaXRpZXMvbWF0ZXJpYWxzLycgKyB0cmFuc2xpdGVyYXRlZENpdHlOYW1lICsgJy5qc29ucCcsXG4gICAgICAgICAgICBmdW5jdGlvbihtYXRlcmlhbERhdGEpIHtcbiAgICAgICAgICAgICAgICBjaXR5RGF0YS5sb2FkaW5nTWF0ZXJpYWxEYXRhID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgY2l0eURhdGEubWF0ZXJpYWxEYXRhID0gbWF0ZXJpYWxEYXRhO1xuXG4gICAgICAgICAgICAgICAgbG9hZGluZ0VtaXR0ZXIuZW1pdCgnbG9hZGVkOicgKyB0cmFuc2xpdGVyYXRlZENpdHlOYW1lKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7IGNhbGxiYWNrTmFtZTogJ19zZXREYXRhJyB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIF91cGRhdGVIZWF0bWFwTGF5ZXJzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHRyYW5zbGl0ZXJhdGVkQ2l0eU5hbWUgPSB0aGlzLl9zZWxlY3RlZENpdHlUcmFuc2xpdGVyYXRlZE5hbWU7XG5cbiAgICAgICAgaWYgKCF0aGlzLl9jaXRpZXMuaGFzT3duUHJvcGVydHkodHJhbnNsaXRlcmF0ZWRDaXR5TmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjaXR5RGF0YSA9IHRoaXMuX2NpdGllc1t0cmFuc2xpdGVyYXRlZENpdHlOYW1lXTtcblxuICAgICAgICBpZiAoY2l0eURhdGEubWF0ZXJpYWxEYXRhID09PSB1bmRlZmluZWQgfHwgY2l0eURhdGEubG9hZGluZ01hdGVyaWFsRGF0YSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGhlYXRtYXBMYXllcnMgPSB0aGlzLl9oZWF0bWFwTGF5ZXJzO1xuXG4gICAgICAgIE9iamVjdC5rZXlzKGNpdHlEYXRhLm1hdGVyaWFsRGF0YSkuZm9yRWFjaChmdW5jdGlvbihtYXRlcmlhbE5hbWUpIHtcbiAgICAgICAgICAgIGlmICghbWF0ZXJpYWxzLmhhc093blByb3BlcnR5KG1hdGVyaWFsTmFtZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5fYmNNYXRlcmlhbE9wdGlvbnNbbWF0ZXJpYWxOYW1lXS5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbWFwLnJlbW92ZUxheWVyKGhlYXRtYXBMYXllcnNbbWF0ZXJpYWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9tYXAuYWRkTGF5ZXIoaGVhdG1hcExheWVyc1ttYXRlcmlhbE5hbWVdKTtcblxuICAgICAgICAgICAgdmFyIGhlYXRtYXBMYXllckRhdGEgPSBPYmplY3Qua2V5cyhjaXR5RGF0YS5tYXRlcmlhbERhdGFbbWF0ZXJpYWxOYW1lXSkubWFwKGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgICAgICAgICAgdmFyIGl0ZW0gPSB0aGlzW2lkXTtcblxuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIGxhdDogK2l0ZW1bMV0sXG4gICAgICAgICAgICAgICAgICAgIGxuZzogK2l0ZW1bMF0sXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiAxXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0sIGNpdHlEYXRhLm1hdGVyaWFsRGF0YVttYXRlcmlhbE5hbWVdKTtcblxuICAgICAgICAgICAgaGVhdG1hcExheWVyc1ttYXRlcmlhbE5hbWVdLnNldERhdGEoe1xuICAgICAgICAgICAgICAgIG1heDogOCxcbiAgICAgICAgICAgICAgICBkYXRhOiBoZWF0bWFwTGF5ZXJEYXRhXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIHNob3dDaXR5TGlzdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLl9jaXR5TGlzdElzU2hvd24pIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2NpdHlMaXN0SXNTaG93biA9IHRydWU7XG4gICAgICAgIHRoaXMuZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdfc3RhdGUtY2l0eUxpc3QnKTtcblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgaGlkZUNpdHlMaXN0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9jaXR5TGlzdElzU2hvd24pIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2NpdHlMaXN0SXNTaG93biA9IGZhbHNlO1xuICAgICAgICB0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSgnX3N0YXRlLWNpdHlMaXN0Jyk7XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW3N0YXRlVmFsdWVdXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgdG9vZ2xlQ2l0eUxpc3Q6IGZ1bmN0aW9uKHN0YXRlVmFsdWUpIHtcbiAgICAgICAgaWYgKHN0YXRlVmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc3RhdGVWYWx1ZSA9ICF0aGlzLl9jaXR5TGlzdElzU2hvd247XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3RhdGVWYWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5zaG93Q2l0eUxpc3QoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaGlkZUNpdHlMaXN0KCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3RhdGVWYWx1ZTtcbiAgICB9LFxuXG4gICAgZGVzdHJveTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgIH1cbn0pO1xuXG53aW5kb3cubWF0ZXJpYWxzQXBwID0gbmV3IE1hdGVyaWFsc0FwcCgpO1xuIiwiXG4oZnVuY3Rpb24odW5kZWZpbmVkKSB7XG5cbiAgICB2YXIgZ2xvYmFsID0gdGhpcztcblxuICAgIGZ1bmN0aW9uIGtyaW9uKCkge1xuICAgICAgICAvL1xuICAgIH1cblxuICAgIHZhciB1aWRDb3VudGVyID0gMDtcblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtpbnR9XG4gICAgICovXG4gICAgZnVuY3Rpb24gbmV4dFVJRCgpIHtcbiAgICAgICAgcmV0dXJuICsrdWlkQ291bnRlcjtcbiAgICB9XG5cbiAgICBrcmlvbi5uZXh0VUlEID0gbmV4dFVJRDtcblxuICAgIC8vIE9iamVjdCB1dGlsc1xuXG4gICAga3Jpb24ub2JqZWN0ID0ge307XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gICAgICogQHJldHVybnMge2ludH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRVSUQob2JqKSB7XG4gICAgICAgIHJldHVybiBvYmouX3VpZCB8fCAob2JqLl91aWQgPSArK3VpZENvdW50ZXIpO1xuICAgIH1cblxuICAgIGtyaW9uLm9iamVjdC5nZXRVSUQgPSBnZXRVSUQ7XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNvdXJjZVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAgICovXG4gICAgZnVuY3Rpb24gYXNzaWduKG9iaiwgc291cmNlKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKHNvdXJjZSkuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICAgICBvYmpbbmFtZV0gPSBzb3VyY2VbbmFtZV07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAga3Jpb24ub2JqZWN0LmFzc2lnbiA9IGFzc2lnbjtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc291cmNlXG4gICAgICogQHJldHVybnMge09iamVjdH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBtaXhpbihvYmosIHNvdXJjZSkge1xuICAgICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhzb3VyY2UpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwgbmFtZSwgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihzb3VyY2UsIG5hbWUpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICBrcmlvbi5vYmplY3QubWl4aW4gPSBtaXhpbjtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNsb25lKG9iaikge1xuICAgICAgICByZXR1cm4gbWl4aW4oT2JqZWN0LmNyZWF0ZShPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqKSksIG9iaik7XG4gICAgfVxuXG4gICAga3Jpb24ub2JqZWN0LmNsb25lID0gY2xvbmU7XG5cbiAgICAvLyBDbGFzcyB1dGlsc1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW1twYXJlbnQ9T2JqZWN0XV1cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGVjbGFyYXRpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2RlY2xhcmF0aW9uLl9fbmFtZV1cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZGVjbGFyYXRpb24uY29uc3RydWN0b3JdXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2RlY2xhcmF0aW9uLl9pbml0XVxuICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVDbGFzcyhwYXJlbnQsIGRlY2xhcmF0aW9uKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgIGRlY2xhcmF0aW9uID0gcGFyZW50O1xuICAgICAgICAgICAgcGFyZW50ID0gT2JqZWN0O1xuICAgICAgICB9IGVsc2UgaWYgKHBhcmVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwYXJlbnQgPSBPYmplY3Q7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY29uc3RydWN0b3I7XG5cbiAgICAgICAgaWYgKGRlY2xhcmF0aW9uLmhhc093blByb3BlcnR5KCdjb25zdHJ1Y3RvcicpKSB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvciA9IGRlY2xhcmF0aW9uLmNvbnN0cnVjdG9yO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3RydWN0b3IgPSBkZWNsYXJhdGlvbi5jb25zdHJ1Y3RvciA9IGZ1bmN0aW9uIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZSA9IHRoaXMgaW5zdGFuY2VvZiBjb25zdHJ1Y3RvciA/IHRoaXMgOiBPYmplY3QuY3JlYXRlKGNvbnN0cnVjdG9yLnByb3RvdHlwZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuX2luaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuX2luaXQuYXBwbHkoaW5zdGFuY2UsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcHJvdG8gPSBjb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHR5cGVvZiBwYXJlbnQgPT0gJ2Z1bmN0aW9uJyA/IHBhcmVudC5wcm90b3R5cGUgOiBwYXJlbnQpO1xuXG4gICAgICAgIGlmIChkZWNsYXJhdGlvbi5zdGF0aWMpIHtcbiAgICAgICAgICAgIG1peGluKGNvbnN0cnVjdG9yLCBkZWNsYXJhdGlvbi5zdGF0aWMpO1xuICAgICAgICAgICAgZGVsZXRlIGRlY2xhcmF0aW9uLnN0YXRpYztcbiAgICAgICAgfVxuXG4gICAgICAgIG1peGluKHByb3RvLCBkZWNsYXJhdGlvbik7XG5cbiAgICAgICAgaWYgKCFwcm90by5oYXNPd25Qcm9wZXJ0eSgndG9TdHJpbmcnKSAmJiBwcm90by5oYXNPd25Qcm9wZXJ0eSgnX19uYW1lJykpIHtcbiAgICAgICAgICAgIHByb3RvLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdbb2JqZWN0ICcgKyB0aGlzLl9fbmFtZSArICddJztcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY29uc3RydWN0b3I7XG4gICAgfVxuXG4gICAga3Jpb24uY3JlYXRlQ2xhc3MgPSBjcmVhdGVDbGFzcztcblxuICAgIHZhciByZUxpc3RlbmVyTmFtZSA9IC9eX29uW0EtWl0vO1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtBcnJheTxzdHJpbmc+fSBbbmFtZXNdXG4gICAgICovXG4gICAgZnVuY3Rpb24gYmluZExpc3RlbmVycyhpbnN0YW5jZSwgbmFtZXMpIHtcbiAgICAgICAgaWYgKG5hbWVzKSB7XG4gICAgICAgICAgICBuYW1lcy5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZVtuYW1lXSA9IGluc3RhbmNlW25hbWVdLmJpbmQoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbGlzdGVuZXJzID0gaW5zdGFuY2UuY29uc3RydWN0b3IuX2xpc3RlbmVyc0ZvckJpbmRpbmc7XG4gICAgICAgICAgICB2YXIgbmFtZTtcblxuICAgICAgICAgICAgaWYgKCFsaXN0ZW5lcnMpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBpbnN0YW5jZS5jb25zdHJ1Y3Rvci5fbGlzdGVuZXJzRm9yQmluZGluZyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICAgICAgICAgICAgICBmb3IgKG5hbWUgaW4gaW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlTGlzdGVuZXJOYW1lLnRlc3QobmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyc1tuYW1lXSA9IGluc3RhbmNlW25hbWVdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKG5hbWUgaW4gbGlzdGVuZXJzKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2VbbmFtZV0gPSBpbnN0YW5jZVtuYW1lXS5iaW5kKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGtyaW9uLmJpbmRMaXN0ZW5lcnMgPSBiaW5kTGlzdGVuZXJzO1xuXG4gICAgLy8gUmVnRXhwIHV0aWxzXG5cbiAgICBrcmlvbi5yZWdleCA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlXG4gICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBlc2NhcGVSZWdFeHAocmUpIHtcbiAgICAgICAgcmV0dXJuIHJlLnJlcGxhY2UoLyhbPyFbK1xcLVxcLl1efHt9KD06KSRcXC9cXFxcKl0pL2csICdcXFxcJDEnKTtcbiAgICB9XG5cbiAgICBrcmlvbi5yZWdleC5lc2NhcGUgPSBlc2NhcGU7XG5cbiAgICAvLyBUZW1wbGF0ZSB1dGlsc1xuXG4gICAga3Jpb24udG1wbCA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHN0clxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbHVlc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZm9ybWF0KHN0ciwgdmFsdWVzKSB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZXMpKSB7XG4gICAgICAgICAgICB2YWx1ZXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHN0ci5yZXBsYWNlKC8lKFxcZCspL2csIGZ1bmN0aW9uKG1hdGNoLCBudW0pIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXNbTnVtYmVyKG51bSkgLSAxXTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAga3Jpb24udG1wbC5mb3JtYXQgPSBmb3JtYXQ7XG5cbiAgICAvLyBET00gdXRpbHNcblxuICAgIGtyaW9uLmRvbSA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtOb2RlfSBub2RlXG4gICAgICogQHBhcmFtIHtOb2RlfSBhbmNlc3RvclxuICAgICAqIEBwYXJhbSB7Tm9kZX0gW2xpbWl0Tm9kZV1cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc0Rlc2NlbmRhbnRPZihub2RlLCBhbmNlc3RvciwgbGltaXROb2RlKSB7XG4gICAgICAgIGlmIChsaW1pdE5vZGUpIHtcbiAgICAgICAgICAgIHdoaWxlIChub2RlID0gbm9kZS5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUgPT0gYW5jZXN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChub2RlID09IGxpbWl0Tm9kZSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3aGlsZSAobm9kZSA9IG5vZGUucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlID09IGFuY2VzdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAga3Jpb24uZG9tLmlzRGVzY2VuZGFudE9mID0gaXNEZXNjZW5kYW50T2Y7XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge05vZGV9IG5vZGVcbiAgICAgKiBAcGFyYW0ge05vZGV9IGFuY2VzdG9yXG4gICAgICogQHBhcmFtIHtOb2RlfSBbbGltaXROb2RlXVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzU2VsZk9yRGVzY2VuZGFudE9mKG5vZGUsIGFuY2VzdG9yLCBsaW1pdE5vZGUpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUgPT0gYW5jZXN0b3IgfHwgaXNEZXNjZW5kYW50T2Yobm9kZSwgYW5jZXN0b3IsIGxpbWl0Tm9kZSk7XG4gICAgfVxuXG4gICAga3Jpb24uZG9tLmlzU2VsZk9yRGVzY2VuZGFudE9mID0gaXNTZWxmT3JEZXNjZW5kYW50T2Y7XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGFnTmFtZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0PHN0cmluZz59IFthdHRyaWJ1dGVzXVxuICAgICAqIEBwYXJhbSB7QXJyYXk8Tm9kZXxzdHJpbmc+fEhUTUxFbGVtZW50fERvY3VtZW50RnJhZ21lbnR9IFtzdWJub2Rlc11cbiAgICAgKiBAcmV0dXJucyB7SFRNTEVsZW1lbnR9XG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlRWxlbWVudCh0YWdOYW1lLCBhdHRyaWJ1dGVzLCBzdWJub2Rlcykge1xuICAgICAgICByZXR1cm4gc2V0RWxlbWVudChkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpLCBhdHRyaWJ1dGVzLCBzdWJub2Rlcyk7XG4gICAgfVxuXG4gICAga3Jpb24uZG9tLmNyZWF0ZUVsZW1lbnQgPSBjcmVhdGVFbGVtZW50O1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGh0bWxcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbdmFsdWVzXVxuICAgICAqIEByZXR1cm5zIHtIVE1MRWxlbWVudH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVFbGVtZW50RnJvbUhUTUwoaHRtbCwgdmFsdWVzKSB7XG4gICAgICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlcykpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBodG1sID0gZm9ybWF0KGh0bWwsIHZhbHVlcyk7XG4gICAgICAgIH1cblxuICAgICAgICBlbC5pbm5lckhUTUwgPSBodG1sO1xuXG4gICAgICAgIHJldHVybiBlbC5jaGlsZE5vZGVzLmxlbmd0aCA9PSAxICYmIGVsLmZpcnN0Q2hpbGQubm9kZVR5cGUgPT0gMSA/IGVsLmZpcnN0Q2hpbGQgOiBlbDtcbiAgICB9XG5cbiAgICBrcmlvbi5kb20uY3JlYXRlRWxlbWVudEZyb21IVE1MID0gY3JlYXRlRWxlbWVudEZyb21IVE1MO1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxcbiAgICAgKiBAcGFyYW0ge09iamVjdDxzdHJpbmc+fSBbYXR0cmlidXRlc11cbiAgICAgKiBAcGFyYW0ge0FycmF5PE5vZGV8c3RyaW5nPnxIVE1MRWxlbWVudHxEb2N1bWVudEZyYWdtZW50fSBbc3Vibm9kZXNdXG4gICAgICogQHJldHVybnMge0hUTUxFbGVtZW50fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNldEVsZW1lbnQoZWwsIGF0dHJpYnV0ZXMsIHN1Ym5vZGVzKSB7XG4gICAgICAgIGlmIChhdHRyaWJ1dGVzICE9IG51bGwpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGF0dHJpYnV0ZXMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZShuYW1lLCBhdHRyaWJ1dGVzW25hbWVdKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN1Ym5vZGVzICE9IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHN1Ym5vZGVzKSkge1xuICAgICAgICAgICAgICAgIHN1Ym5vZGVzLmZvckVhY2goZnVuY3Rpb24oc3Vibm9kZSkge1xuICAgICAgICAgICAgICAgICAgICBlbC5hcHBlbmRDaGlsZCh0eXBlb2Ygc3Vibm9kZSA9PSAnc3RyaW5nJyA/IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN1Ym5vZGUpIDogc3Vibm9kZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoc3Vibm9kZXMubm9kZVR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxOiAvLyBFTEVNRU5UX05PREVcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vdmVDaGlsZHJlbihzdWJub2RlcywgZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTE6IC8vIERPQ1VNRU5UX0ZSQUdNRU5UX05PREVcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLmFwcGVuZENoaWxkKHN1Ym5vZGVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlbDtcbiAgICB9XG5cbiAgICBrcmlvbi5kb20uc2V0RWxlbWVudCA9IHNldEVsZW1lbnQ7XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge05vZGV9IG5vZGVcbiAgICAgKiBAcGFyYW0ge05vZGV9IHRhcmdldFxuICAgICAqIEByZXR1cm5zIHtOb2RlfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1vdmVDaGlsZHJlbihub2RlLCB0YXJnZXQpIHtcbiAgICAgICAgaWYgKG5vZGUgIT0gdGFyZ2V0KSB7XG4gICAgICAgICAgICB3aGlsZSAobm9kZS5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0LmFwcGVuZENoaWxkKG5vZGUuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG5cbiAgICBrcmlvbi5kb20ubW92ZUNoaWxkcmVuID0gbW92ZUNoaWxkcmVuO1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtOb2RlfSBub2RlXG4gICAgICogQHJldHVybnMge05vZGV9XG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVtb3ZlTm9kZShub2RlKSB7XG4gICAgICAgIGlmIChub2RlLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgIG5vZGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG5cbiAgICBrcmlvbi5kb20ucmVtb3ZlTm9kZSA9IHJlbW92ZU5vZGU7XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBhZGRTY3JpcHQodXJsLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG5cbiAgICAgICAgc2NyaXB0LnNyYyA9IHVybDtcbiAgICAgICAgc2NyaXB0LmFzeW5jID0gdHJ1ZTtcblxuICAgICAgICBzY3JpcHQub25sb2FkID0gc2NyaXB0Lm9uZXJyb3IgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIHNjcmlwdC5vbmxvYWQgPSBzY3JpcHQub25lcnJvciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXZ0LnR5cGUgPT0gJ2xvYWQnKTtcbiAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICB9O1xuXG4gICAgICAgIChkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcbiAgICB9XG5cbiAgICBrcmlvbi5kb20uYWRkU2NyaXB0ID0gYWRkU2NyaXB0O1xuXG4gICAgLy8gQUpBWCB1dGlsc1xuXG4gICAga3Jpb24uYWpheCA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHVybFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0aW9ucy5jYWxsYmFja0tleT0nY2FsbGJhY2snXVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0aW9ucy5jYWxsYmFja05hbWVdXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5wcmV2ZW50Q2FjaGluZz10cnVlXVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuY2FjaGluZ1ByZXZlbnRpb25LZXk9J19yJ11cbiAgICAgKiBAcGFyYW0ge2ludH0gW29wdGlvbnMudGltZW91dD0zMDAwMF1cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbb3B0aW9ucy5vbkZhaWx1cmVdXG4gICAgICovXG4gICAgZnVuY3Rpb24ganNvbnAodXJsLCBjYWxsYmFjaywgb3B0aW9ucykge1xuICAgICAgICBpZiAob3B0aW9ucyA9PSBudWxsKSB7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW9wdGlvbnMuY2FsbGJhY2tLZXkpIHsgb3B0aW9ucy5jYWxsYmFja0tleSA9ICdjYWxsYmFjayc7IH1cbiAgICAgICAgaWYgKCFvcHRpb25zLmNhbGxiYWNrTmFtZSkgeyBvcHRpb25zLmNhbGxiYWNrTmFtZSA9ICdfX2NhbGxiYWNrJyArIG5leHRVSUQoKTsgfVxuICAgICAgICBpZiAob3B0aW9ucy5wcmV2ZW50Q2FjaGluZyA9PT0gdW5kZWZpbmVkKSB7IG9wdGlvbnMucHJldmVudENhY2hpbmcgPSB0cnVlOyB9XG4gICAgICAgIGlmICghb3B0aW9ucy5jYWNoaW5nUHJldmVudGlvbktleSkgeyBvcHRpb25zLmNhY2hpbmdQcmV2ZW50aW9uS2V5ID0gJ19yJzsgfVxuICAgICAgICBpZiAoIW9wdGlvbnMudGltZW91dCkgeyBvcHRpb25zLnRpbWVvdXQgPSAzMDAwMDsgfVxuXG4gICAgICAgIHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcblxuICAgICAgICBzY3JpcHQuc3JjID0gdXJsICsgKHVybC5pbmRleE9mKCc/JykgIT0gLTEgPyAnJicgOiAnPycpICsgb3B0aW9ucy5jYWxsYmFja0tleSArICc9JyArIG9wdGlvbnMuY2FsbGJhY2tOYW1lICtcbiAgICAgICAgICAgIChvcHRpb25zLnByZXZlbnRDYWNoaW5nID8gJyYnICsgb3B0aW9ucy5jYWNoaW5nUHJldmVudGlvbktleSArICc9JyArIE1hdGgucmFuZG9tKCkgOiAnJyk7XG4gICAgICAgIHNjcmlwdC5hc3luYyA9IHRydWU7XG5cbiAgICAgICAgc2NyaXB0Lm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNsZWFyKCk7XG5cbiAgICAgICAgICAgIGlmIChvcHRpb25zLm9uRmFpbHVyZSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMub25GYWlsdXJlLmNhbGwod2luZG93KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB3aW5kb3dbb3B0aW9ucy5jYWxsYmFja05hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjbGVhcigpO1xuICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgdGltZXJJZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjbGVhcigpO1xuXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5vbkZhaWx1cmUpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLm9uRmFpbHVyZS5jYWxsKHdpbmRvdyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIG9wdGlvbnMudGltZW91dCk7XG5cbiAgICAgICAgZnVuY3Rpb24gY2xlYXIoKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZXJJZCk7XG4gICAgICAgICAgICBkZWxldGUgd2luZG93W29wdGlvbnMuY2FsbGJhY2tOYW1lXTtcbiAgICAgICAgICAgIHNjcmlwdC5vbmVycm9yID0gbnVsbDtcbiAgICAgICAgICAgIHNjcmlwdC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHNjcmlwdCk7XG4gICAgICAgIH1cblxuICAgICAgICAoZG9jdW1lbnQuaGVhZCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpLmFwcGVuZENoaWxkKHNjcmlwdCk7XG4gICAgfVxuXG4gICAga3Jpb24uYWpheC5qc29ucCA9IGpzb25wO1xuXG4gICAgLy8gRW1pdHRlclxuXG4gICAgdmFyIEVtaXR0ZXIgPSBrcmlvbi5FbWl0dGVyID0gY3JlYXRlQ2xhc3Moe1xuICAgICAgICBfX25hbWU6ICdrcmlvbi5FbWl0dGVyJyxcblxuICAgICAgICBfZXZlbnRzOiBudWxsLFxuXG4gICAgICAgIF9saXN0ZW5pbmdUbzogbnVsbCxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXJcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IFtjb250ZXh0XVxuICAgICAgICAgKiBAcmV0dXJucyB7a3Jpb24uRW1pdHRlcn1cbiAgICAgICAgICovXG4gICAgICAgIG9uOiBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lciwgY29udGV4dCkge1xuICAgICAgICAgICAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCAodGhpcy5fZXZlbnRzID0gT2JqZWN0LmNyZWF0ZShudWxsKSk7XG5cbiAgICAgICAgICAgIChldmVudHNbdHlwZV0gfHwgKGV2ZW50c1t0eXBlXSA9IFtdKSkucHVzaCh7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXI6IGxpc3RlbmVyLFxuICAgICAgICAgICAgICAgIGNvbnRleHQ6IGNvbnRleHRcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IFt0eXBlXVxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbbGlzdGVuZXJdXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbY29udGV4dF1cbiAgICAgICAgICogQHJldHVybnMge2tyaW9uLkVtaXR0ZXJ9XG4gICAgICAgICAqL1xuICAgICAgICBvZmY6IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyLCBjb250ZXh0KSB7XG4gICAgICAgICAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzO1xuXG4gICAgICAgICAgICBpZiAoIWV2ZW50cykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodHlwZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdmFyIHR5cGVzID0gT2JqZWN0LmtleXMoZXZlbnRzKTtcbiAgICAgICAgICAgICAgICB2YXIgaSA9IHR5cGVzLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgIHdoaWxlIChpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub2ZmKHR5cGVzWy0taV0sIGxpc3RlbmVyLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZXZlbnRzID0gZXZlbnRzW3R5cGVdO1xuXG4gICAgICAgICAgICBpZiAoZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgdmFyIGkgPSBldmVudHMubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgd2hpbGUgKGkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGV2ZW50ID0gZXZlbnRzWy0taV07XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgKGxpc3RlbmVyID09PSB1bmRlZmluZWQgfHwgbGlzdGVuZXIgPT0gZXZlbnQubGlzdGVuZXIgfHwgbGlzdGVuZXIgPT0gZXZlbnQubGlzdGVuZXIuX2lubmVyKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQgPT0gZXZlbnQuY29udGV4dFxuICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIWV2ZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lclxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbnRleHRdXG4gICAgICAgICAqIEByZXR1cm5zIHtrcmlvbi5FbWl0dGVyfVxuICAgICAgICAgKi9cbiAgICAgICAgb25jZTogZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIGZ1bmN0aW9uIHdyYXBwZXIoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vZmYodHlwZSwgd3JhcHBlcik7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdyYXBwZXIuX2lubmVyID0gbGlzdGVuZXI7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9uKHR5cGUsIHdyYXBwZXIsIGNvbnRleHQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICAgICAgICAgKiBAcGFyYW0geyp9IC4uLmFyZ3NcbiAgICAgICAgICogQHJldHVybnMge2tyaW9uLkVtaXR0ZXJ9XG4gICAgICAgICAqL1xuICAgICAgICBlbWl0OiBmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgICAgICB2YXIgZXZlbnRzID0gKHRoaXMuX2V2ZW50cyB8fCAodGhpcy5fZXZlbnRzID0gT2JqZWN0LmNyZWF0ZShudWxsKSkpW3R5cGVdO1xuXG4gICAgICAgICAgICBpZiAoZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBldmVudHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50c1tpXS5saXN0ZW5lci5hcHBseShldmVudHNbaV0uY29udGV4dCB8fCB0aGlzLCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gdGFyZ2V0XG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbY29udGV4dF1cbiAgICAgICAgICogQHJldHVybnMge2tyaW9uLkVtaXR0ZXJ9XG4gICAgICAgICAqL1xuICAgICAgICBsaXN0ZW5UbzogZnVuY3Rpb24odGFyZ2V0LCB0eXBlLCBsaXN0ZW5lciwgY29udGV4dCkge1xuICAgICAgICAgICAgdmFyIGxpc3RlbmluZ1RvID0gdGhpcy5fbGlzdGVuaW5nVG8gfHwgKHRoaXMuX2xpc3RlbmluZ1RvID0gT2JqZWN0LmNyZWF0ZShudWxsKSk7XG4gICAgICAgICAgICB2YXIgaWQgPSBnZXRVSUQodGFyZ2V0KSArICctJyArIHR5cGUgKyAnLScgKyBnZXRVSUQobGlzdGVuZXIpICsgKGNvbnRleHQgPyBnZXRVSUQoY29udGV4dCkgOiAnMCcpO1xuXG4gICAgICAgICAgICBpZiAoIShpZCBpbiBsaXN0ZW5pbmdUbykpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5pbmdUb1tpZF0gPSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldDogdGFyZ2V0LFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lcjogbGlzdGVuZXIsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQ6IGNvbnRleHRcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgd3JhcHBlciA9IGxpc3RlbmluZ1RvW2lkXS53cmFwcGVyID0gbGlzdGVuZXIuYmluZChjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyYXBwZXIuX2lubmVyID0gbGlzdGVuZXI7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIHdyYXBwZXIpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0Lm9uKHR5cGUsIGxpc3RlbmVyLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gdGFyZ2V0XG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbY29udGV4dF1cbiAgICAgICAgICogQHJldHVybnMge2tyaW9uLkVtaXR0ZXJ9XG4gICAgICAgICAqL1xuICAgICAgICBzdG9wTGlzdGVuaW5nOiBmdW5jdGlvbih0YXJnZXQsIHR5cGUsIGxpc3RlbmVyLCBjb250ZXh0KSB7XG4gICAgICAgICAgICB2YXIgbGlzdGVuaW5nVG8gPSB0aGlzLl9saXN0ZW5pbmdUbyB8fCAodGhpcy5fbGlzdGVuaW5nVG8gPSBPYmplY3QuY3JlYXRlKG51bGwpKTtcblxuICAgICAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB2YXIgaWQgPSBnZXRVSUQodGFyZ2V0KSArICctJyArIHR5cGUgKyAnLScgKyBnZXRVSUQobGlzdGVuZXIpICsgKGNvbnRleHQgPyBnZXRVSUQoY29udGV4dCkgOiAnMCcpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGlkIGluIGxpc3RlbmluZ1RvKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlbW92ZUxpc3RlbmVyKGxpc3RlbmluZ1RvW2lkXSk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBsaXN0ZW5pbmdUb1tpZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpZCBpbiBsaXN0ZW5pbmdUbykge1xuICAgICAgICAgICAgICAgICAgICByZW1vdmVMaXN0ZW5lcihsaXN0ZW5pbmdUb1tpZF0pO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgbGlzdGVuaW5nVG9baWRdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyKGV2ZW50KSB7XG4gICAgICAgIGlmIChldmVudC50YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgZXZlbnQudGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQudHlwZSwgZXZlbnQuY29udGV4dCA/IGV2ZW50LndyYXBwZXIgOiBldmVudC5saXN0ZW5lcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBldmVudC50YXJnZXQub2ZmKGV2ZW50LnR5cGUsIGV2ZW50Lmxpc3RlbmVyLCBldmVudC5jb250ZXh0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0eXBlb2YgZXhwb3J0cyAhPSAndW5kZWZpbmVkJykge1xuICAgICAgICBpZiAodHlwZW9mIG1vZHVsZSAhPSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBrcmlvbjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGV4cG9ydHMua3Jpb24gPSBrcmlvbjtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHdpbmRvdy5rcmlvbiA9IGtyaW9uO1xuICAgIH1cblxufSkoKTtcbiJdfQ==
