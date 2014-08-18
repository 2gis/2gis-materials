
var proto = require('./proto');
var Emitter = require('./Emitter');

var ActiveArray = module.exports = proto.createClass(Emitter, {
    __name: 'Rift.ActiveArray',

    _inner: null,

    /**
     * @param {Array} [arr]
     */
    _init: function(arr) {
        Emitter.prototype._init.call(this);

        if (arr) {
            this._inner = (arr instanceof ActiveArray ? arr._inner : arr).slice(0);
        } else {
            this._inner = [];
        }
    },

    /**
     * @param {int} index
     * @returns {*}
     */
    get: function(index) {
        return this._inner[index];
    },

    /**
     * @param {int} index
     * @param {*} value
     * @returns {Rift.ActiveArray}
     */
    set: function(index, value) {
        var inner = this._inner;

        if (inner[index] !== value || !(index in inner)) {
            var oldLength = inner.length;

            inner[index] = value;
            this.emit('change', inner.length, oldLength);
        }
        return this;
    },

    /**
     * @param {int} index
     * @returns {Rift.ActiveArray}
     */
    delete: function(index) {
        var inner = this._inner;

        if (index in inner) {
            var oldLength = inner.length;

            delete inner[index];
            this.emit('change', inner.length, oldLength);
        }
        return this;
    },

    /**
     * @returns {int}
     */
    get length() {
        return this._inner.length;
    },

    /**
     * @param {int} value
     */
    set length(value) {
        var oldLength = this._inner.length;

        if (oldLength !== value) {
            this._inner.length = value;
            this.emit('change', value, oldLength);
        }
    },

    /**
     * @param {*} value
     * @param {int} [fromIndex]
     * @returns {int}
     */
    indexOf: function(value, fromIndex) {
        return this._inner.indexOf(value, fromIndex);
    },

    /**
     * @param {*} value
     * @param {int} [fromIndex]
     * @returns {int}
     */
    lastIndexOf: function(value, fromIndex) {
        return this._inner.lastIndexOf(value, fromIndex);
    },

    /**
     * @param {*} ...values
     * @returns {int}
     */
    push: function() {
        var inner = this._inner;
        var oldLength = inner.length;

        if (!arguments.length) {
            return oldLength;
        }

        Array.prototype.push.apply(inner, arguments);

        // Запоминаем что бы вернуть значение, которое было до emit (может измениться в обработчиках).
        var length = inner.length;

        this.emit('change', length, oldLength);

        return length;
    },

    /**
     * @param {*} ...values
     * @returns {int}
     */
    pushUnique: function() {
        var inner = this._inner;
        var values = Array.prototype.reduce.call(arguments, function(values, value) {
            if (inner.indexOf(value) == -1 && values.indexOf(value) == -1) {
                values.push(value);
            }
            return values;
        }, []);

        return this.push.apply(this, values);
    },

    /**
     * @returns {*}
     */
    shift: function() {
        var oldLength = this._inner.length;

        if (oldLength > 0) {
            var value = this._inner.shift();

            this.emit('change', oldLength - 1, oldLength);

            return value;
        }
    },

    /**
     * @param {*} ...values
     * @returns {int}
     */
    unshift: function() {
        var inner = this._inner;
        var oldLength = inner.length;

        if (!arguments.length) {
            return oldLength;
        }

        Array.prototype.unshift.apply(inner, arguments);

        // Запоминаем что бы вернуть значение, которое было до emit (может измениться в обработчиках).
        var length = inner.length;

        this.emit('change', length, oldLength);

        return length;
    },

    /**
     * @returns {*}
     */
    pop: function() {
        var oldLength = this._inner.length;

        if (oldLength > 0) {
            var value = this._inner.pop();

            this.emit('change', oldLength - 1, oldLength);

            return value;
        }
    },

    /**
     * @param {string} glue
     * @returns {string}
     */
    join: function(glue) {
        return this._inner.join(glue);
    },

    /**
     * @param {*} ...values
     * @returns {Rift.ActiveArray}
     */
    concat: function() {
        var values = Array.prototype.map.call(arguments, function(value) {
            return value instanceof ActiveArray ? value._inner : value;
        });

        return new this.constructor(Array.prototype.concat.apply(this._inner, values));
    },

    /**
     * @param {int} fromIndex
     * @param {int} [toIndex]
     * @returns {Rift.ActiveArray}
     */
    slice: function(fromIndex, toIndex) {
        return new this.constructor(this._inner.slice(fromIndex, toIndex));
    },

    /**
     * @returns {Rift.ActiveArray}
     */
    clone: function() {
        return new this.constructor(this);
    },

    /**
     * @returns {Array}
     */
    toArray: function() {
        return this._inner.slice(0);
    },

    /**
     * @returns {string}
     */
    toString: function() {
        return this._inner.toString();
    }
});

['forEach', 'map', 'filter', 'every', 'some', 'reduce', 'reduceRight'].forEach(function(name) {
    declaration[name] = function() {
        var result = Array.prototype[name].apply(this._inner, arguments);

        if (name != 'forEach') {
            if (name == 'map' || name == 'filter') {
                return new this.constructor(result);
            } else {
                return result;
            }
        }
    };
});
