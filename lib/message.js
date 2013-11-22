var fields = ['plugin', 'spreadsheet', 'sheet', 'cache', 'sort', 'query', 'd'];

var Message = {
	
	serialize: function( obj ) {
		return (obj.plugin || '-') + ':' +
				(obj.spreadsheet || '-') + ':' +
				(obj.sheet || '-') + ':' +
				(obj.cache || '-') + ':' +
				(obj.sort || '-') + ':' +
				(obj.query || '-') + ':' +
				(obj.d || '-').toString();

	},

	deserialize: function( key ) {
		var o = {},
			f = key.split(':');

		f.forEach(function(e,i){
			o[fields[i]] = (e == '-') ? null : e;
		});

		return o;
	},

	fromRequest: function( request ) {
		return Message.serialize({
			plugin: request.param('plugin'),
			spreadsheet: request.param('key'),
			cache: request.param('exp'),
			sheet: request.param('sheet'),
			sort: request.param('sort'),
			query: request.param('q'),
			d: request.param('d')
		});
	}
};

module.exports = Message;
