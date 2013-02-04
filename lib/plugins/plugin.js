var EventEmitter = require('events').EventEmitter,
	util = require('util'),
	path = require('path');


// Base Plugin Class
var Plugin = function Plugin(){};

util.inherits(Plugin, EventEmitter);

Plugin.prototype.work = function work( job ) {

	if ( !job ) {
		return this;
	}

	// TODO: common stuff needed before a job

	this.doJob( job );

	// TODO: common stuff after a job

	return this;
};


// Base Plugin Class: Abstract methods
Plugin.prototype.init = function init( options ) {};
Plugin.prototype.destroy = function destroy() {};
Plugin.prototype.doJob = function doJob( job ) {};



// Plugin Subclassing - static method
var optFns = ['init', 'destroy', 'doJob'];

Plugin.sub = function sub( type, options ) {
	options = options || {};
	var fn = !type ? function(){} : new Function('return function ' + type + '(){}')();
	util.inherits(fn, Plugin);

	fn.prototype.version = options.version;

	if ( options.name ) {
		if ( options.name.toString().indexOf('/') === -1 ) {
			fn.prototype.name = options.name.toString();
		} else {
			fn.prototype.name = path.basename( options.name ).toString();
		}
	}

	optFns.forEach(function( f ){
		if ( typeof options[f] === 'function' ) {
			fn.prototype[f] = options[f];
		}
	});

	return fn;
};

module.exports = Plugin;
