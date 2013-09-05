var cache = require('../cache');

exports.purge = function purge() {
  return function doPurge( req, res, next ) {
    cache.purgeCache( req.plugin.message, req.queue, function() {
      console.log('Purge done', req.plugin.message);
      next();
    });
  }
};

exports.headers = function headers() {
  return function setPurgeHeaders ( req, res, next ) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('ETag', new Date().toUTCString());
    next();
  }
};

exports.response = function response() {
  return function purgeResponse( req, res, next ) {
	 res.send(200, 'done');
  }
};
