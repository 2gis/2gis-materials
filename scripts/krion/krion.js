
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
