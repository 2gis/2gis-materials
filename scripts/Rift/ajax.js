
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

exports.jsonp = jsonp;
