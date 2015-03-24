var Plugin = require('../plugin.js');

var BasicPlugin = Plugin.sub('BasicPlugin', {

	version: '0.0.1',

	name: __dirname,

	init: function init( options ) {
		console.log('INIT', options);
	},

	destroy: function destroy() {
		console.log('DESTROYING BASICS');
	},

	doJob: function doJob( job ) {
		console.log('DOING A BASIC JOB');

		setTimeout(function(){

			var replacer = null,
			spaces = 0,
			json = JSON.stringify( {name:'Something'}, replacer, spaces );

			job.set('type', 'json');
			job.set('cache', '1 year');
			job.set('body', json);
			job.etag();

			if ( job.get('spreadsheet') !== 'one' ) {
				var fakeError = new Error('Cannot find spreadsheet');
				fakeError.statusCode = 404;
				job.fail( fakeError );
			} else {
				job.succeed();
			}

		},1);
	}

});


module.exports = new BasicPlugin();
