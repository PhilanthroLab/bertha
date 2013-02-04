var cache = require('../cache');

exports.respond = function respond( req, res ) {

	var onError = sendError.bind( res ),
		onSuccess = sendJSON.bind( res ),
		onNotModified = notModified.bind( res ),
		msg = req.plugin.message;

	var to = setTimeout(function(){
		onError( 404, new Error('Cannot find document') );
	}, 30000);

	var opts = {
		key: msg,
		etag: req.get('If-None-Match'),
		notModified: onNotModified,
		no: enqueue( req.queue ),
		yes: onSuccess,
		error: onError,
		always: function( key ) {
			clearTimeout( to );
		}
	};

	cache.isCached( opts );
};

function notModified( key ) {
	console.log('Not modified');

	// What about Akamai on 304s?
	// Edge-Control “downstream-ttl=86400″

	this.send( 304 );
}

function enqueue( queueClient ) {
	return function( tryAgain, opts ) {

		function evtHandler( evt, result, data ) {
			if ( evt === 'succeed' ) {
				tryAgain();
				return;
			}

			opts.error( result );
		}

		function pushCallback( redisErr ) {
			if ( redisErr ) {
				queueClient.removeListener( key, evtHandler );
				fail( redisErr );
				return;
			}
		}

		queueClient.once(opts.key, evtHandler).push(opts.key, pushCallback);
	};
}

function sendError( err, a, b ) {
	this.jsonp(err.code || 404, {message:err.message});
}

function sendJSON( doc ) {
	var req = this.req,
		app = this.app,
		cacheLength = 0,
		cache = doc.cache,
		year = 31536000;

		// 1 hours = 3600
		// 1 year = 31536000
		//todo: more advanced caching options

		console.log('DOC', doc);
		cacheLength = cache ? year : 0;

	if ( doc.etag ) {
		this.set( 'ETag', doc.etag );
		this.set('Cache-Control', ('public, max-age=' + Math.min(cacheLength, year)).toString());
	}

	// What about Akamai?
	// Edge-Control “downstream-ttl=86400″

	this.charset = doc.charset || this.charset || 'utf-8';

	var callbackName = req.query[app.get('jsonp callback name')];

	if (  callbackName ) {
		// copied from express.js response implementation
		this.set('Content-Type', 'text/javascript');
		doc.body.toString().replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
		callbackName = callbackName.replace(/[^\[\]\w$.]/g, '');
		doc.body = callbackName + ' && ' + callbackName + '(' + doc.body + ');';
	} else {
		this.set('Content-Type', 'application/json');

		// CORS headers
		// for more details: http://www.html5rocks.com/en/tutorials/cors/
		var origin = req.get('Origin');
		if ( origin ) {
			this.set('Access-Control-Allow-Origin', origin);
			this.set('Access-Control-Allow-Method', 'GET');
			this.set('Access-Control-Allow-Headers', 'X-Requested-With, ETag');
			// CORS credential header not needed at the moment
			//this.set('Access-Control-Allow-Credentials', 'true');
		}
	}
	
	this.send(200, doc.body);
}

var durations = {
	'minute': 60,
	'hour': 60*60,
	'day': 60*60*24,
	'week': 60*60*24*7,
	'month':60*60*24*7*31
};

function parseDate( str ) {
	try{
		
	return (isNaN( str ) ? function(s){
		var r = s.split(' ');
		return r.length > 1 ? Number(r[0]) * (durations[r[r.length-1]]):0;
	}(str) : parseInt(str, 10)) || 0;
	} catch(err) {
		return 0;
	}
}
