var Plugins = require('../plugin.js'),
	googleSpreadsheets = require('../../google/googlespreadsheet.js'),
	_ = require('underscore');


var ProfilePlugin = Plugins.sub('ProfilePlugin', {

	version: '0.0.1',

	name: __dirname,

	init: function init( options ) {
		console.log('INIT Google Spreadsheet Plugin');

		var credentials = process.env.GOOGLE_LOGIN.split('/');

		this.username = credentials[0],
		this.password = credentials[1];

		this.api = googleSpreadsheets({
			username: this.username,
			password: this.password
		});

	},

	destroy: function destroy() {
		console.log('DESTROYING Profile Google Spreadsheet stuff');
	},

	doJob: function doJob( job ) {

		var self = this;

		var id = job.get('spreadsheet');

		if ( !id ) {
			var noIdError = new Error('Spreadsheet Key not specified');
			noIdError.code = 404;
			job.fail( noIdError );
			return;
		}

		job.set('type', 'json');
		job.set('cache', '1 year');
		
		var sheetNames = ['nodes', 'credits', 'config'];

		this.api.spreadsheet( id ).fetchSheetDataListFeed(sheetNames, function( err, sheets ) {
			if ( err ) {
				job.fail( err );
				return;
			}

			if ( !sheets ) {
				var e = new Error('No Sheet Data Found');
				e.code = 404;
				job.fail( e );
			}

			var body = sheetNames.length == 1 ? sheets[sheetNames[0]] : sheets;
			job.set( 'body', body );
			job.succeed();
		});

	}
});

module.exports = new ProfilePlugin();
