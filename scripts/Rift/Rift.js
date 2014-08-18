
var Rift = module.exports = {};

Rift.utils = require('./utils');
Rift.object = require('./object');

var cl = require('./cl');

Rift.cl = cl;
Rift.createClass = cl.createClass;

Rift.regex = require('./regex');
Rift.string = require('./string');
Rift.dom = require('./dom');
Rift.ajax = require('./ajax');
Rift.Emitter = require('./Emitter');
