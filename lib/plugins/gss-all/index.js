var Plugins = require('../plugin.js'),
  googleSpreadsheets = require('../../google/googlespreadsheet.js'),
  GssUtils = require('../../google/gssUtils.js'),
  _ = require('underscore');


var GSSAllPlugin = Plugins.sub('GSSAllPlugin', {

  version: '0.0.1',

  name: __dirname,

  init: function init( options ) {
    var credentials = process.env.GOOGLE_LOGIN.split('/');

    this.username = credentials[0],
    this.password = credentials[1];

    this.api = googleSpreadsheets({
      username: this.username,
      password: this.password
    });

  },

  destroy: function destroy() {
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

    var ss = this.api.spreadsheet( id );

    ss.fetchWorksheetFeed(function (err, data) {

      var sheetNames;

      if (!ss.sheetsByName || !(sheetNames = Object.keys(ss.sheetsByName)).length) {
        job.set('body', {});
        job.succeed();
        return;
      }

      console.log('SHEET NAMES', sheetNames)

      var opts = GssUtils.pluckOptions( job );

      ss.fetchSheetDataListFeed(sheetNames, opts, function( err, sheets ) {
        if ( err ) {
          job.fail( err );
          return;
        }

        if ( !sheets ) {
          var e = new Error('No Sheet Data Found');
          e.code = 404;
          job.fail( e );
          return;
        }

        job.set( 'body', sheets );
        job.succeed();
      });

    });

  }
});

module.exports = new GSSAllPlugin();
