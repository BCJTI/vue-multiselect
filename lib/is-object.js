'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = isObject;
function isObject(value) {
	return Object.prototype.toString.call(value) === '[object Object]';
}