
exports.utils = require('./utils');
exports.object = require('./object');
exports.regex = require('./regex');
exports.string = require('./string');

var proto = require('./proto');

exports.proto = proto;
exports.createClass = proto.createClass;

exports.Emitter = require('./Emitter');

exports.html = require('html');
exports.dom = require('./dom');
exports.ajax = require('./ajax');
