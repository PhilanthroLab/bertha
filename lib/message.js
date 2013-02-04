var fields = ['plugin', 'spreadsheet', 'sheet', 'sort', 'query'];

var Message = {
	
	serialize: function( obj ) {
		return (obj.plugin || '-') + ':' +
				(obj.spreadsheet || '-') + ':' +
				(obj.sheet || '-') + ':' +
				(obj.sort || '-') + ':' +
				(obj.query || '-').toString();

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
			sheet: request.param('sheet')
		});
	}
};

module.exports = Message;