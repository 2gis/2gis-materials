
var utils = require('./utils');
var nextUID = utils.nextUID;

/**
 * @param {Object} obj
 * @returns {int}
 */
function getUID(obj) {
    return obj._uid || (obj._uid = nextUID());
}

exports.getUID = getUID;

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

exports.mixin = mixin;

/**
 * @param {Object} obj
 * @returns {Object}
 */
function clone(obj) {
    return mixin(Object.create(Object.getPrototypeOf(obj)), obj);
}

exports.clone = clone;

var reListenerName = /^_on[A-Z]/;

/**
 * @param {Object} obj
 * @param {Array<string>} [names]
 */
function bindListeners(obj, names) {
    if (names) {
        names.forEach(function(name) {
            obj[name] = obj[name].bind(obj);
        });
    } else {
        var listeners = obj.constructor._listenersForBinding;
        var name;

        if (!listeners) {
            listeners = obj.constructor._listenersForBinding = Object.create(null);

            for (name in obj) {
                if (reListenerName.test(name)) {
                    listeners[name] = obj[name];
                }
            }
        }

        for (name in listeners) {
            obj[name] = obj[name].bind(obj);
        }
    }
}

exports.bindListeners = bindListeners;
