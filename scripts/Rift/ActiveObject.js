
var object = require('./object');
var proto = require('./proto');
var Emitter = require('./Emitter');

var ActiveObject = module.exports = proto.createClass(Emitter, {
    __name: 'Rift.ActiveObject',

    _inner: null,

    /**
     * @param {Object} [obj]
     */
    _init: function(obj) {
        Emitter.prototype._init.call(this);

        if (obj) {
            this._inner = object.clone(obj instanceof ActiveObject ? obj._inner : obj);
        } else {
            this._inner = {};
        }
    },

    /**
     * @param {string} key
     * @returns {boolean}
     */
    hasOwnProp: function(key) {
        return this._inner.hasOwnProperty(key);
    },

    /**
     * @param {string} key
     * @returns {boolean}
     */
    hasProp: function(key) {
        return key in this._inner;
    },

    /**
     * @param {string} key
     * @returns {*}
     */
    get: function(key) {
        return this._inner[key];
    },

    /**
     * @param {string} key
     * @param {*} value
     * @returns {Rift.ActiveObject}
     */
    set: function(key, value) {
        var inner = this._inner;

        if (inner[key] !== value || !inner.hasOwnProperty(key)) {
            var oldValue = inner[key];

            var diff = {};
            diff[key] = [value, oldValue];

            inner[key] = value;

            this.emit('change:' + key, value, oldValue);
            this.emit('change', diff);
        }
        return this;
    },

    /**
     * @param {string} key
     * @returns {Rift.ActiveObject}
     */
    delete: function(key) {
        var inner = this._inner;

        if (inner.hasOwnProperty(key)) {
            var oldValue = inner[key];

            var diff = {};
            diff[key] = [undefined, inner[key]];

            delete inner[key];

            this.emit('change:' + key, undefined, oldValue);
            this.emit('change', diff);
        }
        return this;
    },

    /**
     * @param {Object} data
     * @returns {Rift.ActiveObject}
     */
    assign: function(data) {
        var inner = this._inner;

        var diff = {};

        Object.keys(data).forEach(function(key) {
            var value = data[key];

            if (inner[key] !== value || !inner.hasOwnProperty(key)) {
                diff[key] = [value, inner[key]];
                inner[key] = value;
            }
        });

        for (var any in diff) {
            Object.keys(diff).forEach(function(key) {
                this.emit('change:' + key, diff[key][0], diff[key][1]);
            }, this);

            this.emit('change', diff);
        }

        return this;
    },

    /**
     * @returns {Array<string>}
     */
    keys: function() {
        return Object.keys(this._inner);
    },

    /**
     * @returns {Rift.ActiveObject}
     */
    clone: function() {
        return new this.constructor(this);
    },

    /**
     * @returns {Object}
     */
    toObject: function() {
        return object.clone(this._inner);
    }
});
