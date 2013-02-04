var cache = require('../cache');

exports.respond = function respond( req, res ) {

	res.set('Cache-Control', 'public, max-age=0');
	res.set('ETag', new Date().toUTCString());

	var origin = req.get('Origin');
	if ( origin ) {
		res.set('Access-Control-Allow-Origin', origin);
		res.set('Access-Control-Allow-Method', 'GET');
		res.set('Access-Control-Allow-Headers', 'X-Requested-With, ETag');
	}

	cache.purgeCache( req.plugin.message, req.queue, function() {
		res.send(200, 'done');
	});
};
