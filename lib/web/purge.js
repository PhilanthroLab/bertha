var cache = require('../cache');


exports.doPurge = function doPurge( req, res, next ) {
	cache.purgeCache( req.plugin.message, req.queue, function() {
		console.log('Purge done', req.plugin.message);
		next();
	});
};

exports.respond = function respond( req, res, next ) {

	res.set('Cache-Control', 'public, max-age=0');
	res.set('ETag', new Date().toUTCString());

	var origin = req.get('Origin');
	if ( origin ) {
		res.set('Access-Control-Allow-Origin', '*');
		res.set('Access-Control-Allow-Method', 'GET');
		res.set('Access-Control-Allow-Headers', 'X-Requested-With, ETag');
	}

	res.send(200, 'done');

};
