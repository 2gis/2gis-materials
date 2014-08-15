
var object = require('./object');
var getUID = object.getUID;
var createClass = require('./createClass');

/**
 * @private
 */
function removeListener(event) {
    if (event.target.removeEventListener) {
        event.target.removeEventListener(event.type, event.context ? event.wrapper : event.listener);
    } else {
        event.target.off(event.type, event.listener, event.context);
    }
}

var Emitter = module.exports = createClass({
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
     * @param {string} type
     * @param {Function} listener
     * @param {Object} [context]
     * @returns {Rift.Emitter}
     */
    off: function(type, listener, context) {
        var events = (this._events || (this._events = Object.create(null)))[type];

        if (!events) {
            return this;
        }

        var i = events.length;

        while (i) {
            var event = events[--i];

            if ((listener == event.listener || listener == event.listener._inner) && context == event.context) {
                events.splice(i, 1);
            }
        }

        if (!events.length) {
            delete this._events[type];
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
     * @param {*} [...args]
     * @returns {Rift.Emitter}
     */
    emit: function(type) {
        var events = (this._events || (this._events = Object.create(null)))[type];

        if (typeof this['on' + type] == 'function') {
            (events = events ? events.slice(0) : []).push(this['on' + type]);
        } else {
            if (!events) {
                return;
            }

            events = events.slice(0);
        }

        var args = Array.prototype.slice.call(arguments, 1);

        for (var i = 0, l = events.length; i < l; i++) {
            events[i].listener.apply(events[i].context || this, args);
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

        if (id in listeningTo) {
            return this;
        }

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
