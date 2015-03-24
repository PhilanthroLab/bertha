var _ = require('lodash'),
	path = require( 'path' ),
	Message = require('../message.js');

var PluginFactory = function(){
	this.instances = {};
};

PluginFactory.prototype.pluginsDir = __dirname;

PluginFactory.prototype.createPlugin = function createPlugin( name, options ) {
	var opts = _.extend({}, options);
	var pluginDir = path.normalize( opts.dirname || path.join(this.pluginsDir, name) );
	var plugin;

	try {
		plugin = require( pluginDir );
	} catch (err) {
		var unknownPluginError = new Error('Plugin not found');
		unknownPluginError.statusCode = 404;
		throw unknownPluginError;
	}

	plugin.name = name;
	plugin.init( opts );

	return plugin;
};

PluginFactory.prototype.registerInstance = function registerInstance( name, instance ) {
	return this.instances[name] = instance;
};

PluginFactory.prototype.getPlugin = function getPlugin( name, options ) {
	if ( !this.instances[name] ) {
		var newPlugin = this.createPlugin( name, options );
		return this.registerInstance( name, newPlugin );
	}
	return this.instances[name];
};

PluginFactory.prototype.getMessageHandler = function( pluginName ) {
	// TODO: delegate message passing to a handler function.
	// Just a simple function at the mo
	return Message.fromRequest;
};

module.exports = new PluginFactory();
