var PluginFactory = require('../index.js');
var Plugin = require('../plugin.js');


var p = PluginFactory.getPlugin('ig');

// a simplistic approach. see more:
// http://stackoverflow.com/questions/1661197/valid-characters-for-javascript-variable-names
var isJSVariable = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;

var JsPlugin = Plugin.sub('JsPlugin', {

  version: '0.0.1',
  name: __dirname,

  init: function init( options ) {
    p.init();
  },

  destroy: function destroy() {
    p.destory();
  },

  doJob: function doJob( job ) {
    var modifyBody = function(name, value) {
      if (name !== 'body') {
        return;
      }
      job.removeListener('change', modifyBody);
      var namespace = job.get('d') || '';
      var s = namespace.split('.');
      var namespaceSrc = '';
      var ref = '';
      var spreadsheetKey = job.get('spreadsheet');

      if (s.length === 1 && !s[0]) {
        namespaceSrc = 'window.bertha_data = window.bertha_data || {};window.bertha_data["' + spreadsheetKey + '"]=';
      } else {
        for (var i = 0, x = s.length - 1; i < x; i += 1) {
          if (s[i] && isJSVariable.test(s[i])) {
            ref += '["' + s[i] + '"]';
            namespaceSrc += ('window' + ref + '=window' + ref + '||{};');
          } else {
            job.fail(new Error('Invalid Namespace string used on parameter \'d\''));
            return;
          }
        }
        if (!s[s.length - 1] || !isJSVariable.test(s[s.length - 1])) {
            job.fail(new Error('Invalid Namespace string used on parameter \'d\''));
            return;
        }
        ref += '["' + s[s.length - 1] + '"]';
        namespaceSrc += ('window' + ref + '=');
      }

      var newString = '';
      newString += '/*\n';
      newString += 'Spreadsheet: ' + spreadsheetKey + '\n';
      newString += 'Made by Bertha at ' + (new Date().toISOString()) + '\n';
      newString += '*/\n';
      newString += ';(function(window){' + namespaceSrc + JSON.stringify(value,null,0) + ';}(this));';

      job.set('body', newString);
      job.set('type', 'js');

    };

    job.on('change', modifyBody);
    p.doJob(job);
  }

});

module.exports = new JsPlugin();
