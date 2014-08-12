
var uidCounter = 0;

/**
 * @returns {int}
 */
function nextUID() {
    return ++uidCounter;
}

/**
 * @param {Object} proto
 * @param {Array<Object>} [...mixins]
 * @returns {Object}
 */
function createObject(proto) {
    var obj = Object.create(proto);

    if (arguments.length > 1) {
        for (var i = 1, l = arguments.length; i < l; i++) {
            var mixin = arguments[i];

            if (mixin === Object(mixin)) {
                extendObject(obj, mixin);
            }
        }
    }
    return obj;
}

/**
 * @param {Object} obj
 * @param {Object} source
 * @returns {Object}
 */
function extendObject(obj, source) {
    Object.keys(source).forEach(function(name) {
        obj[name] = source[name];
    });
    return obj;
}

/**
 * @param {string} html
 * @returns {HTMLElement}
 */
function createElementFromHTML(html) {
    var el = document.createElement('div');
    el.innerHTML = html;
    return el.childNodes.length == 1 && el.firstChild.nodeType == 1 ? el.firstChild : el;
}

/**
 * @param {string} url
 * @param {Object} [options]
 * @param {int} [options.timeout=30000]
 * @param {Function} [options.onFailure]
 */
function addScript(url, callback, options) {
    if (options == null) {
        options = {};
    }

    if (!options.timeout) { options.timeout = 30000; }

    var script = document.createElement('script');

    script.src = url;
    script.async = true;

    script.onload = function() {
        clear();

        setTimeout(function() {
            callback();
        }, 1);
    };

    script.onerror = function() {
        clear();

        if (options.onFailure) {
            options.onFailure.call(window);
        }
    };

    var timerId = setTimeout(function() {
        clear();

        if (options.onFailure) {
            options.onFailure.call(window);
        }
    }, options.timeout);

    function clear() {
        clearTimeout(timerId);
        script.onload = script.onerror = null;
    }

    (document.head || document.documentElement).appendChild(script);
}

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
