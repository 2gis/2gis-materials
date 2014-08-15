(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

(function(undefined) {

    var global = this;

    function Rift() {
        //
    }

    var uidCounter = 0;

    /**
     * @returns {int}
     */
    function nextUID() {
        return ++uidCounter;
    }

    Rift.nextUID = nextUID;

    // Object utils

    Rift.object = {};

    /**
     * @param {Object} obj
     * @returns {int}
     */
    function getUID(obj) {
        return obj._uid || (obj._uid = ++uidCounter);
    }

    Rift.object.getUID = getUID;

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

    Rift.object.assign = assign;

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

    Rift.object.mixin = mixin;

    /**
     * @param {Object} obj
     * @returns {Object}
     */
    function clone(obj) {
        return mixin(Object.create(Object.getPrototypeOf(obj)), obj);
    }

    Rift.object.clone = clone;

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

    Rift.createClass = createClass;

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

    Rift.bindListeners = bindListeners;

    // RegExp utils

    Rift.regex = {};

    /**
     * @param {string} re
     * @returns {string}
     */
    function escapeRegExp(re) {
        return re.replace(/([?![+\-\.]^|{}(=:)$\/\\*])/g, '\\$1');
    }

    Rift.regex.escape = escape;

    // Template utils

    Rift.tmpl = {};

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

    Rift.tmpl.format = format;

    // DOM utils

    Rift.dom = {};

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

    Rift.dom.isDescendantOf = isDescendantOf;

    /**
     * @param {Node} node
     * @param {Node} ancestor
     * @param {Node} [limitNode]
     * @returns {boolean}
     */
    function isSelfOrDescendantOf(node, ancestor, limitNode) {
        return node == ancestor || isDescendantOf(node, ancestor, limitNode);
    }

    Rift.dom.isSelfOrDescendantOf = isSelfOrDescendantOf;

    /**
     * @param {string} tagName
     * @param {Object<string>} [attributes]
     * @param {Array<Node|string>|HTMLElement|DocumentFragment} [subnodes]
     * @returns {HTMLElement}
     */
    function createElement(tagName, attributes, subnodes) {
        return setElement(document.createElement(tagName), attributes, subnodes);
    }

    Rift.dom.createElement = createElement;

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

    Rift.dom.createElementFromHTML = createElementFromHTML;

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

    Rift.dom.setElement = setElement;

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

    Rift.dom.moveChildren = moveChildren;

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

    Rift.dom.removeNode = removeNode;

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

    Rift.dom.addScript = addScript;

    // AJAX utils

    Rift.ajax = {};

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

    Rift.ajax.jsonp = jsonp;

    // Emitter

    var Emitter = Rift.Emitter = createClass({
        __name: 'Rift.Emitter',

        _events: null,

        _listeningTo: null,

        /**
         * @param {string} type
         * @param {Function} listener
         * @param {Object} [context]
         * @returns {Rift.Emitter}
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
         * @returns {Rift.Emitter}
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
         * @returns {Rift.Emitter}
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
         * @returns {Rift.Emitter}
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
         * @returns {Rift.Emitter}
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
         * @returns {Rift.Emitter}
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
            module.exports = Rift;
        } else {
            exports.Rift = Rift;
        }
    } else {
        window.Rift = Rift;
    }

})();

},{}],2:[function(require,module,exports){

var Rift = require('./Rift/Rift');

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
        Rift.bindListeners(this);

        this.element = document.body;

        DG.then(function() {
            this._findBlocks();

            this._map = DG.map(this._bMap, {
                'center': [54.98, 82.89],
                'zoom': 13
            });

            this._loadScripts(function() {
                this._createHeatmapLayers();

                Rift.ajax.jsonp('data/cities/index.jsonp', function(cities) {
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
        Rift.dom.addScript('node_modules/heatmap.js/build/heatmap.js', function() {
            Rift.dom.addScript('node_modules/heatmap.js/plugins/leaflet-heatmap.js', function() {
                callback.call(this);
            });
        });
    },

    _createHeatmapLayers: function() {
        this._heatmapLayers = Object.keys(materials).reduce(function(heatmapLayers, materialName) {
            heatmapLayers[materialName] = new HeatmapOverlay(
                Rift.object.assign(Object.create(heatmapLayerConf), {
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
            (this._materialDataLoadingEmitter = new Rift.Emitter());

        loadingEmitter.once('loaded:' + transliteratedCityName, callback, this);

        if (cityData.loadingMaterialData) {
            return;
        }

        cityData.loadingMaterialData = true;

        Rift.ajax.jsonp(
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

},{"./Rift/Rift":1}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9kLnZpYmUvMmdpcy8yZ2lzLW1hdGVyaWFscy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZC52aWJlLzJnaXMvMmdpcy1tYXRlcmlhbHMvc2NyaXB0cy9SaWZ0L1JpZnQuanMiLCIvVXNlcnMvZC52aWJlLzJnaXMvMmdpcy1tYXRlcmlhbHMvc2NyaXB0cy9mYWtlXzg4MmRlMTJlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMW1CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG4oZnVuY3Rpb24odW5kZWZpbmVkKSB7XG5cbiAgICB2YXIgZ2xvYmFsID0gdGhpcztcblxuICAgIGZ1bmN0aW9uIFJpZnQoKSB7XG4gICAgICAgIC8vXG4gICAgfVxuXG4gICAgdmFyIHVpZENvdW50ZXIgPSAwO1xuXG4gICAgLyoqXG4gICAgICogQHJldHVybnMge2ludH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBuZXh0VUlEKCkge1xuICAgICAgICByZXR1cm4gKyt1aWRDb3VudGVyO1xuICAgIH1cblxuICAgIFJpZnQubmV4dFVJRCA9IG5leHRVSUQ7XG5cbiAgICAvLyBPYmplY3QgdXRpbHNcblxuICAgIFJpZnQub2JqZWN0ID0ge307XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gICAgICogQHJldHVybnMge2ludH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRVSUQob2JqKSB7XG4gICAgICAgIHJldHVybiBvYmouX3VpZCB8fCAob2JqLl91aWQgPSArK3VpZENvdW50ZXIpO1xuICAgIH1cblxuICAgIFJpZnQub2JqZWN0LmdldFVJRCA9IGdldFVJRDtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc291cmNlXG4gICAgICogQHJldHVybnMge09iamVjdH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBhc3NpZ24ob2JqLCBzb3VyY2UpIHtcbiAgICAgICAgT2JqZWN0LmtleXMoc291cmNlKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgICAgIG9ialtuYW1lXSA9IHNvdXJjZVtuYW1lXTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICBSaWZ0Lm9iamVjdC5hc3NpZ24gPSBhc3NpZ247XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNvdXJjZVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAgICovXG4gICAgZnVuY3Rpb24gbWl4aW4ob2JqLCBzb3VyY2UpIHtcbiAgICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoc291cmNlKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIG5hbWUsIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc291cmNlLCBuYW1lKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgUmlmdC5vYmplY3QubWl4aW4gPSBtaXhpbjtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNsb25lKG9iaikge1xuICAgICAgICByZXR1cm4gbWl4aW4oT2JqZWN0LmNyZWF0ZShPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqKSksIG9iaik7XG4gICAgfVxuXG4gICAgUmlmdC5vYmplY3QuY2xvbmUgPSBjbG9uZTtcblxuICAgIC8vIENsYXNzIHV0aWxzXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbW3BhcmVudD1PYmplY3RdXVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkZWNsYXJhdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbZGVjbGFyYXRpb24uX19uYW1lXVxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtkZWNsYXJhdGlvbi5jb25zdHJ1Y3Rvcl1cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZGVjbGFyYXRpb24uX2luaXRdXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZUNsYXNzKHBhcmVudCwgZGVjbGFyYXRpb24pIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgZGVjbGFyYXRpb24gPSBwYXJlbnQ7XG4gICAgICAgICAgICBwYXJlbnQgPSBPYmplY3Q7XG4gICAgICAgIH0gZWxzZSBpZiAocGFyZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHBhcmVudCA9IE9iamVjdDtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjb25zdHJ1Y3RvcjtcblxuICAgICAgICBpZiAoZGVjbGFyYXRpb24uaGFzT3duUHJvcGVydHkoJ2NvbnN0cnVjdG9yJykpIHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yID0gZGVjbGFyYXRpb24uY29uc3RydWN0b3I7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvciA9IGRlY2xhcmF0aW9uLmNvbnN0cnVjdG9yID0gZnVuY3Rpb24gY29uc3RydWN0b3IoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluc3RhbmNlID0gdGhpcyBpbnN0YW5jZW9mIGNvbnN0cnVjdG9yID8gdGhpcyA6IE9iamVjdC5jcmVhdGUoY29uc3RydWN0b3IucHJvdG90eXBlKTtcblxuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5faW5pdCkge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5faW5pdC5hcHBseShpbnN0YW5jZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBwcm90byA9IGNvbnN0cnVjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUodHlwZW9mIHBhcmVudCA9PSAnZnVuY3Rpb24nID8gcGFyZW50LnByb3RvdHlwZSA6IHBhcmVudCk7XG5cbiAgICAgICAgaWYgKGRlY2xhcmF0aW9uLnN0YXRpYykge1xuICAgICAgICAgICAgbWl4aW4oY29uc3RydWN0b3IsIGRlY2xhcmF0aW9uLnN0YXRpYyk7XG4gICAgICAgICAgICBkZWxldGUgZGVjbGFyYXRpb24uc3RhdGljO1xuICAgICAgICB9XG5cbiAgICAgICAgbWl4aW4ocHJvdG8sIGRlY2xhcmF0aW9uKTtcblxuICAgICAgICBpZiAoIXByb3RvLmhhc093blByb3BlcnR5KCd0b1N0cmluZycpICYmIHByb3RvLmhhc093blByb3BlcnR5KCdfX25hbWUnKSkge1xuICAgICAgICAgICAgcHJvdG8udG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ1tvYmplY3QgJyArIHRoaXMuX19uYW1lICsgJ10nO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjb25zdHJ1Y3RvcjtcbiAgICB9XG5cbiAgICBSaWZ0LmNyZWF0ZUNsYXNzID0gY3JlYXRlQ2xhc3M7XG5cbiAgICB2YXIgcmVMaXN0ZW5lck5hbWUgPSAvXl9vbltBLVpdLztcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7QXJyYXk8c3RyaW5nPn0gW25hbWVzXVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGJpbmRMaXN0ZW5lcnMoaW5zdGFuY2UsIG5hbWVzKSB7XG4gICAgICAgIGlmIChuYW1lcykge1xuICAgICAgICAgICAgbmFtZXMuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2VbbmFtZV0gPSBpbnN0YW5jZVtuYW1lXS5iaW5kKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGxpc3RlbmVycyA9IGluc3RhbmNlLmNvbnN0cnVjdG9yLl9saXN0ZW5lcnNGb3JCaW5kaW5nO1xuICAgICAgICAgICAgdmFyIG5hbWU7XG5cbiAgICAgICAgICAgIGlmICghbGlzdGVuZXJzKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzID0gaW5zdGFuY2UuY29uc3RydWN0b3IuX2xpc3RlbmVyc0ZvckJpbmRpbmcgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgICAgICAgICAgICAgZm9yIChuYW1lIGluIGluc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZUxpc3RlbmVyTmFtZS50ZXN0KG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lcnNbbmFtZV0gPSBpbnN0YW5jZVtuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChuYW1lIGluIGxpc3RlbmVycykge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlW25hbWVdID0gaW5zdGFuY2VbbmFtZV0uYmluZChpbnN0YW5jZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBSaWZ0LmJpbmRMaXN0ZW5lcnMgPSBiaW5kTGlzdGVuZXJzO1xuXG4gICAgLy8gUmVnRXhwIHV0aWxzXG5cbiAgICBSaWZ0LnJlZ2V4ID0ge307XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGVzY2FwZVJlZ0V4cChyZSkge1xuICAgICAgICByZXR1cm4gcmUucmVwbGFjZSgvKFs/IVsrXFwtXFwuXV58e30oPTopJFxcL1xcXFwqXSkvZywgJ1xcXFwkMScpO1xuICAgIH1cblxuICAgIFJpZnQucmVnZXguZXNjYXBlID0gZXNjYXBlO1xuXG4gICAgLy8gVGVtcGxhdGUgdXRpbHNcblxuICAgIFJpZnQudG1wbCA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHN0clxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbHVlc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZm9ybWF0KHN0ciwgdmFsdWVzKSB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZXMpKSB7XG4gICAgICAgICAgICB2YWx1ZXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHN0ci5yZXBsYWNlKC8lKFxcZCspL2csIGZ1bmN0aW9uKG1hdGNoLCBudW0pIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXNbTnVtYmVyKG51bSkgLSAxXTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgUmlmdC50bXBsLmZvcm1hdCA9IGZvcm1hdDtcblxuICAgIC8vIERPTSB1dGlsc1xuXG4gICAgUmlmdC5kb20gPSB7fTtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICAgICAqIEBwYXJhbSB7Tm9kZX0gYW5jZXN0b3JcbiAgICAgKiBAcGFyYW0ge05vZGV9IFtsaW1pdE5vZGVdXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNEZXNjZW5kYW50T2Yobm9kZSwgYW5jZXN0b3IsIGxpbWl0Tm9kZSkge1xuICAgICAgICBpZiAobGltaXROb2RlKSB7XG4gICAgICAgICAgICB3aGlsZSAobm9kZSA9IG5vZGUucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlID09IGFuY2VzdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobm9kZSA9PSBsaW1pdE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2hpbGUgKG5vZGUgPSBub2RlLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZSA9PSBhbmNlc3Rvcikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIFJpZnQuZG9tLmlzRGVzY2VuZGFudE9mID0gaXNEZXNjZW5kYW50T2Y7XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge05vZGV9IG5vZGVcbiAgICAgKiBAcGFyYW0ge05vZGV9IGFuY2VzdG9yXG4gICAgICogQHBhcmFtIHtOb2RlfSBbbGltaXROb2RlXVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzU2VsZk9yRGVzY2VuZGFudE9mKG5vZGUsIGFuY2VzdG9yLCBsaW1pdE5vZGUpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUgPT0gYW5jZXN0b3IgfHwgaXNEZXNjZW5kYW50T2Yobm9kZSwgYW5jZXN0b3IsIGxpbWl0Tm9kZSk7XG4gICAgfVxuXG4gICAgUmlmdC5kb20uaXNTZWxmT3JEZXNjZW5kYW50T2YgPSBpc1NlbGZPckRlc2NlbmRhbnRPZjtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0YWdOYW1lXG4gICAgICogQHBhcmFtIHtPYmplY3Q8c3RyaW5nPn0gW2F0dHJpYnV0ZXNdXG4gICAgICogQHBhcmFtIHtBcnJheTxOb2RlfHN0cmluZz58SFRNTEVsZW1lbnR8RG9jdW1lbnRGcmFnbWVudH0gW3N1Ym5vZGVzXVxuICAgICAqIEByZXR1cm5zIHtIVE1MRWxlbWVudH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVFbGVtZW50KHRhZ05hbWUsIGF0dHJpYnV0ZXMsIHN1Ym5vZGVzKSB7XG4gICAgICAgIHJldHVybiBzZXRFbGVtZW50KGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSksIGF0dHJpYnV0ZXMsIHN1Ym5vZGVzKTtcbiAgICB9XG5cbiAgICBSaWZ0LmRvbS5jcmVhdGVFbGVtZW50ID0gY3JlYXRlRWxlbWVudDtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sXG4gICAgICogQHBhcmFtIHtBcnJheX0gW3ZhbHVlc11cbiAgICAgKiBAcmV0dXJucyB7SFRNTEVsZW1lbnR9XG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlRWxlbWVudEZyb21IVE1MKGh0bWwsIHZhbHVlcykge1xuICAgICAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZXMpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaHRtbCA9IGZvcm1hdChodG1sLCB2YWx1ZXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgZWwuaW5uZXJIVE1MID0gaHRtbDtcblxuICAgICAgICByZXR1cm4gZWwuY2hpbGROb2Rlcy5sZW5ndGggPT0gMSAmJiBlbC5maXJzdENoaWxkLm5vZGVUeXBlID09IDEgPyBlbC5maXJzdENoaWxkIDogZWw7XG4gICAgfVxuXG4gICAgUmlmdC5kb20uY3JlYXRlRWxlbWVudEZyb21IVE1MID0gY3JlYXRlRWxlbWVudEZyb21IVE1MO1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxcbiAgICAgKiBAcGFyYW0ge09iamVjdDxzdHJpbmc+fSBbYXR0cmlidXRlc11cbiAgICAgKiBAcGFyYW0ge0FycmF5PE5vZGV8c3RyaW5nPnxIVE1MRWxlbWVudHxEb2N1bWVudEZyYWdtZW50fSBbc3Vibm9kZXNdXG4gICAgICogQHJldHVybnMge0hUTUxFbGVtZW50fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNldEVsZW1lbnQoZWwsIGF0dHJpYnV0ZXMsIHN1Ym5vZGVzKSB7XG4gICAgICAgIGlmIChhdHRyaWJ1dGVzICE9IG51bGwpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGF0dHJpYnV0ZXMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZShuYW1lLCBhdHRyaWJ1dGVzW25hbWVdKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN1Ym5vZGVzICE9IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHN1Ym5vZGVzKSkge1xuICAgICAgICAgICAgICAgIHN1Ym5vZGVzLmZvckVhY2goZnVuY3Rpb24oc3Vibm9kZSkge1xuICAgICAgICAgICAgICAgICAgICBlbC5hcHBlbmRDaGlsZCh0eXBlb2Ygc3Vibm9kZSA9PSAnc3RyaW5nJyA/IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN1Ym5vZGUpIDogc3Vibm9kZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoc3Vibm9kZXMubm9kZVR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxOiAvLyBFTEVNRU5UX05PREVcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vdmVDaGlsZHJlbihzdWJub2RlcywgZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTE6IC8vIERPQ1VNRU5UX0ZSQUdNRU5UX05PREVcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLmFwcGVuZENoaWxkKHN1Ym5vZGVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlbDtcbiAgICB9XG5cbiAgICBSaWZ0LmRvbS5zZXRFbGVtZW50ID0gc2V0RWxlbWVudDtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICAgICAqIEBwYXJhbSB7Tm9kZX0gdGFyZ2V0XG4gICAgICogQHJldHVybnMge05vZGV9XG4gICAgICovXG4gICAgZnVuY3Rpb24gbW92ZUNoaWxkcmVuKG5vZGUsIHRhcmdldCkge1xuICAgICAgICBpZiAobm9kZSAhPSB0YXJnZXQpIHtcbiAgICAgICAgICAgIHdoaWxlIChub2RlLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXQuYXBwZW5kQ2hpbGQobm9kZS5maXJzdENoaWxkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH1cblxuICAgIFJpZnQuZG9tLm1vdmVDaGlsZHJlbiA9IG1vdmVDaGlsZHJlbjtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICAgICAqIEByZXR1cm5zIHtOb2RlfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlbW92ZU5vZGUobm9kZSkge1xuICAgICAgICBpZiAobm9kZS5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICBub2RlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuXG4gICAgUmlmdC5kb20ucmVtb3ZlTm9kZSA9IHJlbW92ZU5vZGU7XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBhZGRTY3JpcHQodXJsLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG5cbiAgICAgICAgc2NyaXB0LnNyYyA9IHVybDtcbiAgICAgICAgc2NyaXB0LmFzeW5jID0gdHJ1ZTtcblxuICAgICAgICBzY3JpcHQub25sb2FkID0gc2NyaXB0Lm9uZXJyb3IgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIHNjcmlwdC5vbmxvYWQgPSBzY3JpcHQub25lcnJvciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXZ0LnR5cGUgPT0gJ2xvYWQnKTtcbiAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICB9O1xuXG4gICAgICAgIChkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcbiAgICB9XG5cbiAgICBSaWZ0LmRvbS5hZGRTY3JpcHQgPSBhZGRTY3JpcHQ7XG5cbiAgICAvLyBBSkFYIHV0aWxzXG5cbiAgICBSaWZ0LmFqYXggPSB7fTtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1cmxcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdGlvbnMuY2FsbGJhY2tLZXk9J2NhbGxiYWNrJ11cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdGlvbnMuY2FsbGJhY2tOYW1lXVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMucHJldmVudENhY2hpbmc9dHJ1ZV1cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmNhY2hpbmdQcmV2ZW50aW9uS2V5PSdfciddXG4gICAgICogQHBhcmFtIHtpbnR9IFtvcHRpb25zLnRpbWVvdXQ9MzAwMDBdXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW29wdGlvbnMub25GYWlsdXJlXVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGpzb25wKHVybCwgY2FsbGJhY2ssIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMgPT0gbnVsbCkge1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFvcHRpb25zLmNhbGxiYWNrS2V5KSB7IG9wdGlvbnMuY2FsbGJhY2tLZXkgPSAnY2FsbGJhY2snOyB9XG4gICAgICAgIGlmICghb3B0aW9ucy5jYWxsYmFja05hbWUpIHsgb3B0aW9ucy5jYWxsYmFja05hbWUgPSAnX19jYWxsYmFjaycgKyBuZXh0VUlEKCk7IH1cbiAgICAgICAgaWYgKG9wdGlvbnMucHJldmVudENhY2hpbmcgPT09IHVuZGVmaW5lZCkgeyBvcHRpb25zLnByZXZlbnRDYWNoaW5nID0gdHJ1ZTsgfVxuICAgICAgICBpZiAoIW9wdGlvbnMuY2FjaGluZ1ByZXZlbnRpb25LZXkpIHsgb3B0aW9ucy5jYWNoaW5nUHJldmVudGlvbktleSA9ICdfcic7IH1cbiAgICAgICAgaWYgKCFvcHRpb25zLnRpbWVvdXQpIHsgb3B0aW9ucy50aW1lb3V0ID0gMzAwMDA7IH1cblxuICAgICAgICB2YXIgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG5cbiAgICAgICAgc2NyaXB0LnNyYyA9IHVybCArICh1cmwuaW5kZXhPZignPycpICE9IC0xID8gJyYnIDogJz8nKSArIG9wdGlvbnMuY2FsbGJhY2tLZXkgKyAnPScgKyBvcHRpb25zLmNhbGxiYWNrTmFtZSArXG4gICAgICAgICAgICAob3B0aW9ucy5wcmV2ZW50Q2FjaGluZyA/ICcmJyArIG9wdGlvbnMuY2FjaGluZ1ByZXZlbnRpb25LZXkgKyAnPScgKyBNYXRoLnJhbmRvbSgpIDogJycpO1xuICAgICAgICBzY3JpcHQuYXN5bmMgPSB0cnVlO1xuXG4gICAgICAgIHNjcmlwdC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjbGVhcigpO1xuXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5vbkZhaWx1cmUpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLm9uRmFpbHVyZS5jYWxsKHdpbmRvdyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgd2luZG93W29wdGlvbnMuY2FsbGJhY2tOYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2xlYXIoKTtcbiAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHRpbWVySWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2xlYXIoKTtcblxuICAgICAgICAgICAgaWYgKG9wdGlvbnMub25GYWlsdXJlKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5vbkZhaWx1cmUuY2FsbCh3aW5kb3cpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBvcHRpb25zLnRpbWVvdXQpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNsZWFyKCkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVySWQpO1xuICAgICAgICAgICAgZGVsZXRlIHdpbmRvd1tvcHRpb25zLmNhbGxiYWNrTmFtZV07XG4gICAgICAgICAgICBzY3JpcHQub25lcnJvciA9IG51bGw7XG4gICAgICAgICAgICBzY3JpcHQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzY3JpcHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgKGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KS5hcHBlbmRDaGlsZChzY3JpcHQpO1xuICAgIH1cblxuICAgIFJpZnQuYWpheC5qc29ucCA9IGpzb25wO1xuXG4gICAgLy8gRW1pdHRlclxuXG4gICAgdmFyIEVtaXR0ZXIgPSBSaWZ0LkVtaXR0ZXIgPSBjcmVhdGVDbGFzcyh7XG4gICAgICAgIF9fbmFtZTogJ1JpZnQuRW1pdHRlcicsXG5cbiAgICAgICAgX2V2ZW50czogbnVsbCxcblxuICAgICAgICBfbGlzdGVuaW5nVG86IG51bGwsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbY29udGV4dF1cbiAgICAgICAgICogQHJldHVybnMge1JpZnQuRW1pdHRlcn1cbiAgICAgICAgICovXG4gICAgICAgIG9uOiBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lciwgY29udGV4dCkge1xuICAgICAgICAgICAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCAodGhpcy5fZXZlbnRzID0gT2JqZWN0LmNyZWF0ZShudWxsKSk7XG5cbiAgICAgICAgICAgIChldmVudHNbdHlwZV0gfHwgKGV2ZW50c1t0eXBlXSA9IFtdKSkucHVzaCh7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXI6IGxpc3RlbmVyLFxuICAgICAgICAgICAgICAgIGNvbnRleHQ6IGNvbnRleHRcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IFt0eXBlXVxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbbGlzdGVuZXJdXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbY29udGV4dF1cbiAgICAgICAgICogQHJldHVybnMge1JpZnQuRW1pdHRlcn1cbiAgICAgICAgICovXG4gICAgICAgIG9mZjogZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHM7XG5cbiAgICAgICAgICAgIGlmICghZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0eXBlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdHlwZXMgPSBPYmplY3Qua2V5cyhldmVudHMpO1xuICAgICAgICAgICAgICAgIHZhciBpID0gdHlwZXMubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgd2hpbGUgKGkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vZmYodHlwZXNbLS1pXSwgbGlzdGVuZXIsIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBldmVudHMgPSBldmVudHNbdHlwZV07XG5cbiAgICAgICAgICAgIGlmIChldmVudHMpIHtcbiAgICAgICAgICAgICAgICB2YXIgaSA9IGV2ZW50cy5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICB3aGlsZSAoaSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXZlbnQgPSBldmVudHNbLS1pXTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAobGlzdGVuZXIgPT09IHVuZGVmaW5lZCB8fCBsaXN0ZW5lciA9PSBldmVudC5saXN0ZW5lciB8fCBsaXN0ZW5lciA9PSBldmVudC5saXN0ZW5lci5faW5uZXIpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dCA9PSBldmVudC5jb250ZXh0XG4gICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICghZXZlbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbY29udGV4dF1cbiAgICAgICAgICogQHJldHVybnMge1JpZnQuRW1pdHRlcn1cbiAgICAgICAgICovXG4gICAgICAgIG9uY2U6IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyLCBjb250ZXh0KSB7XG4gICAgICAgICAgICBmdW5jdGlvbiB3cmFwcGVyKCkge1xuICAgICAgICAgICAgICAgIHRoaXMub2ZmKHR5cGUsIHdyYXBwZXIpO1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3cmFwcGVyLl9pbm5lciA9IGxpc3RlbmVyO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vbih0eXBlLCB3cmFwcGVyLCBjb250ZXh0KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAgICAgICAgICogQHBhcmFtIHsqfSAuLi5hcmdzXG4gICAgICAgICAqIEByZXR1cm5zIHtSaWZ0LkVtaXR0ZXJ9XG4gICAgICAgICAqL1xuICAgICAgICBlbWl0OiBmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgICAgICB2YXIgZXZlbnRzID0gKHRoaXMuX2V2ZW50cyB8fCAodGhpcy5fZXZlbnRzID0gT2JqZWN0LmNyZWF0ZShudWxsKSkpW3R5cGVdO1xuXG4gICAgICAgICAgICBpZiAoZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBldmVudHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50c1tpXS5saXN0ZW5lci5hcHBseShldmVudHNbaV0uY29udGV4dCB8fCB0aGlzLCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gdGFyZ2V0XG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbY29udGV4dF1cbiAgICAgICAgICogQHJldHVybnMge1JpZnQuRW1pdHRlcn1cbiAgICAgICAgICovXG4gICAgICAgIGxpc3RlblRvOiBmdW5jdGlvbih0YXJnZXQsIHR5cGUsIGxpc3RlbmVyLCBjb250ZXh0KSB7XG4gICAgICAgICAgICB2YXIgbGlzdGVuaW5nVG8gPSB0aGlzLl9saXN0ZW5pbmdUbyB8fCAodGhpcy5fbGlzdGVuaW5nVG8gPSBPYmplY3QuY3JlYXRlKG51bGwpKTtcbiAgICAgICAgICAgIHZhciBpZCA9IGdldFVJRCh0YXJnZXQpICsgJy0nICsgdHlwZSArICctJyArIGdldFVJRChsaXN0ZW5lcikgKyAoY29udGV4dCA/IGdldFVJRChjb250ZXh0KSA6ICcwJyk7XG5cbiAgICAgICAgICAgIGlmICghKGlkIGluIGxpc3RlbmluZ1RvKSkge1xuICAgICAgICAgICAgICAgIGxpc3RlbmluZ1RvW2lkXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiB0YXJnZXQsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyOiBsaXN0ZW5lcixcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dDogY29udGV4dFxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB3cmFwcGVyID0gbGlzdGVuaW5nVG9baWRdLndyYXBwZXIgPSBsaXN0ZW5lci5iaW5kKGNvbnRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgd3JhcHBlci5faW5uZXIgPSBsaXN0ZW5lcjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgd3JhcHBlcik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQub24odHlwZSwgbGlzdGVuZXIsIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXRcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXJcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IFtjb250ZXh0XVxuICAgICAgICAgKiBAcmV0dXJucyB7UmlmdC5FbWl0dGVyfVxuICAgICAgICAgKi9cbiAgICAgICAgc3RvcExpc3RlbmluZzogZnVuY3Rpb24odGFyZ2V0LCB0eXBlLCBsaXN0ZW5lciwgY29udGV4dCkge1xuICAgICAgICAgICAgdmFyIGxpc3RlbmluZ1RvID0gdGhpcy5fbGlzdGVuaW5nVG8gfHwgKHRoaXMuX2xpc3RlbmluZ1RvID0gT2JqZWN0LmNyZWF0ZShudWxsKSk7XG5cbiAgICAgICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlkID0gZ2V0VUlEKHRhcmdldCkgKyAnLScgKyB0eXBlICsgJy0nICsgZ2V0VUlEKGxpc3RlbmVyKSArIChjb250ZXh0ID8gZ2V0VUlEKGNvbnRleHQpIDogJzAnKTtcblxuICAgICAgICAgICAgICAgIGlmIChpZCBpbiBsaXN0ZW5pbmdUbykge1xuICAgICAgICAgICAgICAgICAgICByZW1vdmVMaXN0ZW5lcihsaXN0ZW5pbmdUb1tpZF0pO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgbGlzdGVuaW5nVG9baWRdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaWQgaW4gbGlzdGVuaW5nVG8pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlTGlzdGVuZXIobGlzdGVuaW5nVG9baWRdKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGxpc3RlbmluZ1RvW2lkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lcihldmVudCkge1xuICAgICAgICBpZiAoZXZlbnQudGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgICAgIGV2ZW50LnRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LnR5cGUsIGV2ZW50LmNvbnRleHQgPyBldmVudC53cmFwcGVyIDogZXZlbnQubGlzdGVuZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXZlbnQudGFyZ2V0Lm9mZihldmVudC50eXBlLCBldmVudC5saXN0ZW5lciwgZXZlbnQuY29udGV4dCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGV4cG9ydHMgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtb2R1bGUgIT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgICAgIG1vZHVsZS5leHBvcnRzID0gUmlmdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGV4cG9ydHMuUmlmdCA9IFJpZnQ7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICB3aW5kb3cuUmlmdCA9IFJpZnQ7XG4gICAgfVxuXG59KSgpO1xuIiwiXG52YXIgUmlmdCA9IHJlcXVpcmUoJy4vUmlmdC9SaWZ0Jyk7XG5cbnZhciBtYXRlcmlhbHMgPSB7XG4gICAgJ9CU0LXRgNC10LLQvic6IHsgY29sb3I6ICcjYjQ3ZTRkJywgZW5OYW1lOiAnd29vZCcgfSxcbiAgICAn0JrQuNGA0L/QuNGHJzogeyBjb2xvcjogJyNmZjY0NjQnLCBlbk5hbWU6ICdicmljaycgfSxcbiAgICAn0J/QsNC90LXQu9GMJzogeyBjb2xvcjogJyMwMDg5NjUnLCBlbk5hbWU6ICdwYW5lbCcgfSxcbiAgICAn0JHQtdGC0L7QvSc6IHsgY29sb3I6ICcjYTA0MDg5JywgZW5OYW1lOiAnY29uY3JldGUnIH0sXG4gICAgJ9Cc0LXRgtCw0LvQuyc6IHsgY29sb3I6ICcjMDA4OGZmJywgZW5OYW1lOiAnbWV0YWwnIH1cbn07XG5cbnZhciBoZWF0bWFwTGF5ZXJDb25mID0ge1xuICAgIC8vIHJhZGl1cyBzaG91bGQgYmUgc21hbGwgT05MWSBpZiBzY2FsZVJhZGl1cyBpcyB0cnVlIChvciBzbWFsbCByYWRpdXMgaXMgaW50ZW5kZWQpXG4gICAgLy8gaWYgc2NhbGVSYWRpdXMgaXMgZmFsc2UgaXQgd2lsbCBiZSB0aGUgY29uc3RhbnQgcmFkaXVzIHVzZWQgaW4gcGl4ZWxzXG4gICAgcmFkaXVzOiAwLjAwMDUsXG5cbiAgICBtYXhPcGFjaXR5OiAwLjcsXG5cbiAgICAvLyBzY2FsZXMgdGhlIHJhZGl1cyBiYXNlZCBvbiBtYXAgem9vbVxuICAgIHNjYWxlUmFkaXVzOiB0cnVlLFxuXG4gICAgYmx1cjogMS4wLFxuXG4gICAgLy8gaWYgc2V0IHRvIGZhbHNlIHRoZSBoZWF0bWFwIHVzZXMgdGhlIGdsb2JhbCBtYXhpbXVtIGZvciBjb2xvcml6YXRpb25cbiAgICAvLyBpZiBhY3RpdmF0ZWQ6IHVzZXMgdGhlIGRhdGEgbWF4aW11bSB3aXRoaW4gdGhlIGN1cnJlbnQgbWFwIGJvdW5kYXJpZXNcbiAgICAvLyAgICh0aGVyZSB3aWxsIGFsd2F5cyBiZSBhIHJlZCBzcG90IHdpdGggdXNlTG9jYWxFeHRyZW1hcyB0cnVlKVxuICAgIHVzZUxvY2FsRXh0cmVtYTogdHJ1ZSxcblxuICAgIGxhdEZpZWxkOiAnbGF0JyxcbiAgICBsbmdGaWVsZDogJ2xuZycsXG4gICAgdmFsdWVGaWVsZDogJ2NvdW50J1xufTtcblxudmFyIE1hdGVyaWFsc0FwcCA9IFJpZnQuY3JlYXRlQ2xhc3MoUmlmdC5FbWl0dGVyLCB7XG4gICAgX19uYW1lOiAnTWF0ZXJpYWxzQXBwJyxcblxuICAgIF9jaXRpZXM6IG51bGwsXG4gICAgX3NlbGVjdGVkQ2l0eVRyYW5zbGl0ZXJhdGVkTmFtZTogbnVsbCxcblxuICAgIF9tYXRlcmlhbERhdGFMb2FkaW5nRW1pdHRlcjogbnVsbCxcblxuICAgIF9jaXR5TGlzdElzU2hvd246IGZhbHNlLFxuXG4gICAgX21hcDogbnVsbCxcblxuICAgIF9oZWF0bWFwTGF5ZXJzOiBudWxsLFxuXG4gICAgZWxlbWVudDogbnVsbCxcbiAgICBfYk1hcDogbnVsbCxcbiAgICBfdGZDaXR5OiBudWxsLFxuICAgIF9iTWF0ZXJpYWxzOiBudWxsLFxuICAgIF9iY01hdGVyaWFsT3B0aW9uczogbnVsbCxcbiAgICBfYkNpdHlMaXN0OiBudWxsLFxuICAgIF9iY0NpdHlMaXN0TGlua3M6IG51bGwsXG4gICAgX2J0blJlYWRNb3JlOiBudWxsLFxuXG4gICAgX2luaXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBSaWZ0LmJpbmRMaXN0ZW5lcnModGhpcyk7XG5cbiAgICAgICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuYm9keTtcblxuICAgICAgICBERy50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5fZmluZEJsb2NrcygpO1xuXG4gICAgICAgICAgICB0aGlzLl9tYXAgPSBERy5tYXAodGhpcy5fYk1hcCwge1xuICAgICAgICAgICAgICAgICdjZW50ZXInOiBbNTQuOTgsIDgyLjg5XSxcbiAgICAgICAgICAgICAgICAnem9vbSc6IDEzXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5fbG9hZFNjcmlwdHMoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY3JlYXRlSGVhdG1hcExheWVycygpO1xuXG4gICAgICAgICAgICAgICAgUmlmdC5hamF4Lmpzb25wKCdkYXRhL2NpdGllcy9pbmRleC5qc29ucCcsIGZ1bmN0aW9uKGNpdGllcykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9jaXRpZXMgPSBjaXRpZXMucmVkdWNlKGZ1bmN0aW9uKGNpdGllcywgY2l0eURhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNpdGllc1tjaXR5RGF0YS50cmFuc2xpdGVyYXRlZE5hbWVdID0gY2l0eURhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2l0aWVzO1xuICAgICAgICAgICAgICAgICAgICB9LCB7fSk7XG5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fdXBkYXRlVEZDaXR5QW5kQkNpdHlMaXN0KCdOb3Zvc3lieXJzaycpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl91cGRhdGVCTWF0ZXJpYWxzKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2JpbmRMaXN0ZW5lcnMoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbG9hZE1hdGVyaWFsRGF0YSh0aGlzLl9zZWxlY3RlZENpdHlUcmFuc2xpdGVyYXRlZE5hbWUsIHRoaXMuX3VwZGF0ZUhlYXRtYXBMYXllcnMpO1xuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSwgeyBjYWxsYmFja05hbWU6ICdfc2V0RGF0YScgfSk7XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgIH0sXG5cbiAgICBfZmluZEJsb2NrczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBlbCA9IHRoaXMuZWxlbWVudDtcblxuICAgICAgICB0aGlzLl9iTWFwID0gZWwucXVlcnlTZWxlY3RvcignW2RhdGEtbmFtZT1iTWFwXScpO1xuICAgICAgICB0aGlzLl90ZkNpdHkgPSBlbC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1uYW1lPXRmQ2l0eV0nKTtcbiAgICAgICAgdGhpcy5fYk1hdGVyaWFscyA9IGVsLnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLW5hbWU9Yk1hdGVyaWFsc10nKTtcbiAgICAgICAgdGhpcy5fYkNpdHlMaXN0ID0gZWwucXVlcnlTZWxlY3RvcignW2RhdGEtbmFtZT1iQ2l0eUxpc3RdJyk7XG4gICAgICAgIHRoaXMuX2J0blJlYWRNb3JlID0gZWwucXVlcnlTZWxlY3RvcignW2RhdGEtbmFtZT1idG5SZWFkTW9yZV0nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBfbG9hZFNjcmlwdHM6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgIFJpZnQuZG9tLmFkZFNjcmlwdCgnbm9kZV9tb2R1bGVzL2hlYXRtYXAuanMvYnVpbGQvaGVhdG1hcC5qcycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgUmlmdC5kb20uYWRkU2NyaXB0KCdub2RlX21vZHVsZXMvaGVhdG1hcC5qcy9wbHVnaW5zL2xlYWZsZXQtaGVhdG1hcC5qcycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwodGhpcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIF9jcmVhdGVIZWF0bWFwTGF5ZXJzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5faGVhdG1hcExheWVycyA9IE9iamVjdC5rZXlzKG1hdGVyaWFscykucmVkdWNlKGZ1bmN0aW9uKGhlYXRtYXBMYXllcnMsIG1hdGVyaWFsTmFtZSkge1xuICAgICAgICAgICAgaGVhdG1hcExheWVyc1ttYXRlcmlhbE5hbWVdID0gbmV3IEhlYXRtYXBPdmVybGF5KFxuICAgICAgICAgICAgICAgIFJpZnQub2JqZWN0LmFzc2lnbihPYmplY3QuY3JlYXRlKGhlYXRtYXBMYXllckNvbmYpLCB7XG4gICAgICAgICAgICAgICAgICAgIGdyYWRpZW50OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAwOiAncmdiYSgwLDAsMCwwKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAxOiBtYXRlcmlhbHNbbWF0ZXJpYWxOYW1lXS5jb2xvclxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHJldHVybiBoZWF0bWFwTGF5ZXJzO1xuICAgICAgICB9LCB7fSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbc2VsZWN0ZWRDaXR5VHJhbnNsaXRlcmF0ZWROYW1lXVxuICAgICAqL1xuICAgIF91cGRhdGVURkNpdHlBbmRCQ2l0eUxpc3Q6IGZ1bmN0aW9uKHNlbGVjdGVkQ2l0eVRyYW5zbGl0ZXJhdGVkTmFtZSkge1xuICAgICAgICB2YXIgYkNpdHlMaXN0ID0gdGhpcy5fYkNpdHlMaXN0O1xuICAgICAgICB2YXIgYmNDaXR5TGlzdExpbmtzID0gdGhpcy5fYmNDaXR5TGlzdExpbmtzID0ge307XG5cbiAgICAgICAgT2JqZWN0LmtleXModGhpcy5fY2l0aWVzKS5mb3JFYWNoKGZ1bmN0aW9uKGNpdHlUcmFuc2xpdGVyYXRlZE5hbWUpIHtcbiAgICAgICAgICAgIHZhciBjaXR5RGF0YSA9IHRoaXMuX2NpdGllc1tjaXR5VHJhbnNsaXRlcmF0ZWROYW1lXTtcblxuICAgICAgICAgICAgdmFyIGxpbmsgPSBSaWZ0LmRvbS5jcmVhdGVFbGVtZW50RnJvbUhUTUwoXG4gICAgICAgICAgICAgICAgJzxhIGRhdGEtdHJhbnNsaXRlcmF0ZWQtbmFtZT1cIiUxXCIgaHJlZj1cIiMlMVwiPiUyPC9hPicsXG4gICAgICAgICAgICAgICAgY2l0eVRyYW5zbGl0ZXJhdGVkTmFtZSxcbiAgICAgICAgICAgICAgICBjaXR5RGF0YS5uYW1lXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICB2YXIgbGkgPSBSaWZ0LmRvbS5jcmVhdGVFbGVtZW50KCdsaScsIG51bGwsIFtsaW5rXSk7XG5cbiAgICAgICAgICAgIGJjQ2l0eUxpc3RMaW5rc1tjaXR5VHJhbnNsaXRlcmF0ZWROYW1lXSA9IGxpbms7XG4gICAgICAgICAgICBiQ2l0eUxpc3QuYXBwZW5kQ2hpbGQobGkpO1xuICAgICAgICB9LCB0aGlzKTtcblxuICAgICAgICBpZiAoc2VsZWN0ZWRDaXR5VHJhbnNsaXRlcmF0ZWROYW1lKSB7XG4gICAgICAgICAgICB0aGlzLl9zZXRDaXR5SW5Db250cm9sUGFuZWwoc2VsZWN0ZWRDaXR5VHJhbnNsaXRlcmF0ZWROYW1lKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHJhbnNsaXRlcmF0ZWRDaXR5TmFtZVxuICAgICAqL1xuICAgIF9zZXRDaXR5SW5Db250cm9sUGFuZWw6IGZ1bmN0aW9uKHRyYW5zbGl0ZXJhdGVkQ2l0eU5hbWUpIHtcbiAgICAgICAgdmFyIGNpdHlEYXRhID0gdGhpcy5fY2l0aWVzW3RyYW5zbGl0ZXJhdGVkQ2l0eU5hbWVdO1xuXG4gICAgICAgIGlmICh0aGlzLl9zZWxlY3RlZENpdHlUcmFuc2xpdGVyYXRlZE5hbWUpIHtcbiAgICAgICAgICAgIHRoaXMuX3RmQ2l0eS5jbGFzc0xpc3QucmVtb3ZlKCdfY2l0eS0nICsgdGhpcy5fc2VsZWN0ZWRDaXR5VHJhbnNsaXRlcmF0ZWROYW1lKTtcbiAgICAgICAgICAgIHRoaXMuX2JjQ2l0eUxpc3RMaW5rc1t0aGlzLl9zZWxlY3RlZENpdHlUcmFuc2xpdGVyYXRlZE5hbWVdLmNsYXNzTGlzdC5yZW1vdmUoJ19zZWxlY3RlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fc2VsZWN0ZWRDaXR5VHJhbnNsaXRlcmF0ZWROYW1lID0gdHJhbnNsaXRlcmF0ZWRDaXR5TmFtZTtcblxuICAgICAgICB0aGlzLl90ZkNpdHkuY2xhc3NMaXN0LmFkZCgnX2NpdHktJyArIHRyYW5zbGl0ZXJhdGVkQ2l0eU5hbWUpO1xuICAgICAgICB0aGlzLl90ZkNpdHkubGFzdEVsZW1lbnRDaGlsZC5pbm5lckhUTUwgPSBjaXR5RGF0YS5uYW1lO1xuICAgICAgICB0aGlzLl9iY0NpdHlMaXN0TGlua3NbdHJhbnNsaXRlcmF0ZWRDaXR5TmFtZV0uY2xhc3NMaXN0LmFkZCgnX3NlbGVjdGVkJyk7XG4gICAgfSxcblxuICAgIF91cGRhdGVCTWF0ZXJpYWxzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGJNYXRlcmlhbHMgPSB0aGlzLl9iTWF0ZXJpYWxzO1xuXG4gICAgICAgIHRoaXMuX2JjTWF0ZXJpYWxPcHRpb25zID0gT2JqZWN0LmtleXMobWF0ZXJpYWxzKS5yZWR1Y2UoZnVuY3Rpb24oYmNNYXRlcmlhbE9wdGlvbnMsIG1hdGVyaWFsTmFtZSkge1xuICAgICAgICAgICAgdmFyIGxhYmVsID0gUmlmdC5kb20uY3JlYXRlRWxlbWVudEZyb21IVE1MKFxuICAgICAgICAgICAgICAgICc8bGFiZWwgY2xhc3M9XCJjaGIgX21hdGVyaWFsLSUxXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNoZWNrZWQ9XCJjaGVja2VkXCIgLz48c3Bhbj48L3NwYW4+JTI8L2xhYmVsPicsXG4gICAgICAgICAgICAgICAgbWF0ZXJpYWxzW21hdGVyaWFsTmFtZV0uZW5OYW1lLFxuICAgICAgICAgICAgICAgIG1hdGVyaWFsTmFtZVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgYmNNYXRlcmlhbE9wdGlvbnNbbWF0ZXJpYWxOYW1lXSA9IGxhYmVsLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICBiTWF0ZXJpYWxzLmFwcGVuZENoaWxkKGxhYmVsKTtcblxuICAgICAgICAgICAgcmV0dXJuIGJjTWF0ZXJpYWxPcHRpb25zO1xuICAgICAgICB9LCB7fSk7XG4gICAgfSxcblxuICAgIF9iaW5kTGlzdGVuZXJzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLl90ZkNpdHksICdjbGljaycsIHRoaXMuX29uVEZDaXR5Q2xpY2spO1xuXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5fYkNpdHlMaXN0LCAnY2xpY2snLCB0aGlzLl9vbkJDaXR5TGlzdENsaWNrKTtcblxuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLl9iY01hdGVyaWFsT3B0aW9ucykuZm9yRWFjaChmdW5jdGlvbihtYXRlcmlhbE5hbWUpIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5fYmNNYXRlcmlhbE9wdGlvbnNbbWF0ZXJpYWxOYW1lXSwgJ2NoYW5nZScsIHRoaXMuX29uQkNNYXRlcmlhbE9wdGlvbnNDaGFuZ2UpO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtNb3VzZUV2ZW50fSBldnRcbiAgICAgKi9cbiAgICBfb25URkNpdHlDbGljazogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIHRoaXMudG9vZ2xlQ2l0eUxpc3QoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtNb3VzZUV2ZW50fSBldnRcbiAgICAgKi9cbiAgICBfb25CQ2l0eUxpc3RDbGljazogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgbGluaztcbiAgICAgICAgICAgIHZhciBub2RlID0gZXZ0LnRhcmdldDtcblxuICAgICAgICAgICAgd2hpbGUgKG5vZGUgIT0gdGhpcy5fYkNpdHlMaXN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUudGFnTmFtZSA9PSAnQScpIHtcbiAgICAgICAgICAgICAgICAgICAgbGluayA9IG5vZGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG5vZGUgPSBub2RlLnBhcmVudE5vZGU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghbGluaykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHRyYW5zbGl0ZXJhdGVkQ2l0eU5hbWUgPSBsaW5rLmRhdGFzZXQudHJhbnNsaXRlcmF0ZWROYW1lO1xuXG4gICAgICAgICAgICB0aGlzLl9zZXRDaXR5SW5Db250cm9sUGFuZWwodHJhbnNsaXRlcmF0ZWRDaXR5TmFtZSk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9jaXRpZXNbdHJhbnNsaXRlcmF0ZWRDaXR5TmFtZV0ubWF0ZXJpYWxEYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9sb2FkTWF0ZXJpYWxEYXRhKHRyYW5zbGl0ZXJhdGVkQ2l0eU5hbWUsIHRoaXMuX3VwZGF0ZUhlYXRtYXBMYXllcnMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl91cGRhdGVIZWF0bWFwTGF5ZXJzKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuaGlkZUNpdHlMaXN0KCk7XG4gICAgICAgIH0uYmluZCh0aGlzKSwgMSk7XG4gICAgfSxcblxuICAgIF9vbkJDTWF0ZXJpYWxPcHRpb25zQ2hhbmdlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUhlYXRtYXBMYXllcnMoKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpLCAxKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRyYW5zbGl0ZXJhdGVkQ2l0eU5hbWVcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqL1xuICAgIF9sb2FkTWF0ZXJpYWxEYXRhOiBmdW5jdGlvbih0cmFuc2xpdGVyYXRlZENpdHlOYW1lLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgY2l0eURhdGEgPSB0aGlzLl9jaXRpZXNbdHJhbnNsaXRlcmF0ZWRDaXR5TmFtZV07XG5cbiAgICAgICAgaWYgKGNpdHlEYXRhLm1hdGVyaWFsRGF0YSkge1xuICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBsb2FkaW5nRW1pdHRlciA9IHRoaXMuX21hdGVyaWFsRGF0YUxvYWRpbmdFbWl0dGVyIHx8XG4gICAgICAgICAgICAodGhpcy5fbWF0ZXJpYWxEYXRhTG9hZGluZ0VtaXR0ZXIgPSBuZXcgUmlmdC5FbWl0dGVyKCkpO1xuXG4gICAgICAgIGxvYWRpbmdFbWl0dGVyLm9uY2UoJ2xvYWRlZDonICsgdHJhbnNsaXRlcmF0ZWRDaXR5TmFtZSwgY2FsbGJhY2ssIHRoaXMpO1xuXG4gICAgICAgIGlmIChjaXR5RGF0YS5sb2FkaW5nTWF0ZXJpYWxEYXRhKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjaXR5RGF0YS5sb2FkaW5nTWF0ZXJpYWxEYXRhID0gdHJ1ZTtcblxuICAgICAgICBSaWZ0LmFqYXguanNvbnAoXG4gICAgICAgICAgICAnZGF0YS9jaXRpZXMvbWF0ZXJpYWxzLycgKyB0cmFuc2xpdGVyYXRlZENpdHlOYW1lICsgJy5qc29ucCcsXG4gICAgICAgICAgICBmdW5jdGlvbihtYXRlcmlhbERhdGEpIHtcbiAgICAgICAgICAgICAgICBjaXR5RGF0YS5sb2FkaW5nTWF0ZXJpYWxEYXRhID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgY2l0eURhdGEubWF0ZXJpYWxEYXRhID0gbWF0ZXJpYWxEYXRhO1xuXG4gICAgICAgICAgICAgICAgbG9hZGluZ0VtaXR0ZXIuZW1pdCgnbG9hZGVkOicgKyB0cmFuc2xpdGVyYXRlZENpdHlOYW1lKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7IGNhbGxiYWNrTmFtZTogJ19zZXREYXRhJyB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIF91cGRhdGVIZWF0bWFwTGF5ZXJzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHRyYW5zbGl0ZXJhdGVkQ2l0eU5hbWUgPSB0aGlzLl9zZWxlY3RlZENpdHlUcmFuc2xpdGVyYXRlZE5hbWU7XG5cbiAgICAgICAgaWYgKCF0aGlzLl9jaXRpZXMuaGFzT3duUHJvcGVydHkodHJhbnNsaXRlcmF0ZWRDaXR5TmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjaXR5RGF0YSA9IHRoaXMuX2NpdGllc1t0cmFuc2xpdGVyYXRlZENpdHlOYW1lXTtcblxuICAgICAgICBpZiAoY2l0eURhdGEubWF0ZXJpYWxEYXRhID09PSB1bmRlZmluZWQgfHwgY2l0eURhdGEubG9hZGluZ01hdGVyaWFsRGF0YSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGhlYXRtYXBMYXllcnMgPSB0aGlzLl9oZWF0bWFwTGF5ZXJzO1xuXG4gICAgICAgIE9iamVjdC5rZXlzKGNpdHlEYXRhLm1hdGVyaWFsRGF0YSkuZm9yRWFjaChmdW5jdGlvbihtYXRlcmlhbE5hbWUpIHtcbiAgICAgICAgICAgIGlmICghbWF0ZXJpYWxzLmhhc093blByb3BlcnR5KG1hdGVyaWFsTmFtZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5fYmNNYXRlcmlhbE9wdGlvbnNbbWF0ZXJpYWxOYW1lXS5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbWFwLnJlbW92ZUxheWVyKGhlYXRtYXBMYXllcnNbbWF0ZXJpYWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9tYXAuYWRkTGF5ZXIoaGVhdG1hcExheWVyc1ttYXRlcmlhbE5hbWVdKTtcblxuICAgICAgICAgICAgdmFyIGhlYXRtYXBMYXllckRhdGEgPSBPYmplY3Qua2V5cyhjaXR5RGF0YS5tYXRlcmlhbERhdGFbbWF0ZXJpYWxOYW1lXSkubWFwKGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgICAgICAgICAgdmFyIGl0ZW0gPSB0aGlzW2lkXTtcblxuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIGxhdDogK2l0ZW1bMV0sXG4gICAgICAgICAgICAgICAgICAgIGxuZzogK2l0ZW1bMF0sXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiAxXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0sIGNpdHlEYXRhLm1hdGVyaWFsRGF0YVttYXRlcmlhbE5hbWVdKTtcblxuICAgICAgICAgICAgaGVhdG1hcExheWVyc1ttYXRlcmlhbE5hbWVdLnNldERhdGEoe1xuICAgICAgICAgICAgICAgIG1heDogOCxcbiAgICAgICAgICAgICAgICBkYXRhOiBoZWF0bWFwTGF5ZXJEYXRhXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIHNob3dDaXR5TGlzdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLl9jaXR5TGlzdElzU2hvd24pIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2NpdHlMaXN0SXNTaG93biA9IHRydWU7XG4gICAgICAgIHRoaXMuZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdfc3RhdGUtY2l0eUxpc3QnKTtcblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgaGlkZUNpdHlMaXN0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9jaXR5TGlzdElzU2hvd24pIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2NpdHlMaXN0SXNTaG93biA9IGZhbHNlO1xuICAgICAgICB0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSgnX3N0YXRlLWNpdHlMaXN0Jyk7XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW3N0YXRlVmFsdWVdXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgdG9vZ2xlQ2l0eUxpc3Q6IGZ1bmN0aW9uKHN0YXRlVmFsdWUpIHtcbiAgICAgICAgaWYgKHN0YXRlVmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc3RhdGVWYWx1ZSA9ICF0aGlzLl9jaXR5TGlzdElzU2hvd247XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3RhdGVWYWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5zaG93Q2l0eUxpc3QoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaGlkZUNpdHlMaXN0KCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3RhdGVWYWx1ZTtcbiAgICB9LFxuXG4gICAgZGVzdHJveTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgIH1cbn0pO1xuXG53aW5kb3cubWF0ZXJpYWxzQXBwID0gbmV3IE1hdGVyaWFsc0FwcCgpO1xuIl19
