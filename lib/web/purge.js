var cache = require('../cache');


exports.doPurge = function doPurge( req, res, next ) {
	cache.purgeCache( req.plugin.message, req.queue, function() {
		console.log('Purge done', req.plugin.message);
		next();
	});
};

exports.respond = function respond( req, res, next ) {
	res.set('Cache-Control', 'private, max-age=0, must-reavalidate');
	res.set('ETag', new Date().toUTCString());
	res.send(200, 'done');
};
