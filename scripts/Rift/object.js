
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
function assign(obj, source) {
    Object.keys(source).forEach(function(name) {
        obj[name] = source[name];
    });

    return obj;
}

exports.assign = assign;

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
