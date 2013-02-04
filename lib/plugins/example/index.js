var Plugin = require('../plugin.js');
var path = require('path');

var ExamplePlugin = Plugin.sub('ExamplePlugin', {

	// just a best-practive thing at the mo.
	version: '0.0.1',

	// This is optional in most case when the
	// plugin this will usually be set by the
	// Plugin factory. By default it'll be the
	// name of the folder the plugin is stored in.
	// If for some reason the factory is not
	// used then you'll need to set this.
	name: __dirname,

	// init is for things in here that will
	// be useful for the life time of the
	// plugin. e.g. get and manage connections
	// to external services etcetera
	init: function init( options ) {
		console.log('INIT', options);
	},

	// destroy is kind of the opposite
	// of the init method use it to do
	// things like return connections to
	// the pool and other cleanup tasks
	destroy: function destroy() {
		console.log('DESTROYING');
	},

	// doJob is called internally when the
	// plugin's work method is called.
	// might not get called if the work method
	// detects that the job has something wrong
	// with it - or there is no job(ie it's null)
	doJob: function doJob( job ) {
		console.log('DOING AN EXAMPLE JOB');
	}

});

module.exports = new ExamplePlugin();
