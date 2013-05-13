var cache = require('../cache');


exports.respond = function respond( req, res ) {

	var onError = sendError.bind( res ),
		onSuccess = sendJSON.bind( res ),
		onNotModified = notModified.bind( res ),
		msg = req.plugin.message;

	var to = setTimeout(function(){
		var nf = new Error('Cannot find document') ;
		nf.code = 404;
		onError( nf );
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

	try {
		cache.isCached( opts );
	} catch (err) {
		onError( err );
	}
};

function notModified( key ) {
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

		cacheLength = parseCacheRule( cache ) || 0;

	if ( doc.etag ) {
		this.set( 'ETag', doc.etag );
		this.set( 'Cache-Control', ('public, max-age=' + Math.min(cacheLength, year)).toString() );
	} else {
		this.set( 'Cache-Control', 'public, max-age=0' );
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
	}
	
	this.send(200, doc.body);
}

var durations = {
	'none': 0,
	'minute': 60,
	'hour': 60*60,
	'day': 60*60*24,
	'week': 60*60*24*7,
	'month':60*60*24*31,
	'year':60*60*24*365
};

var shortHands = {
	'none':0,
	'tiny':10,
	'short':durations.minute * 10, // 10mins
	'medium': durations.week*1.5, // 10.5 days
	'long':durations.day*90, // 90 days
	'forever':durations.year // never cache more than a year
};

function parseCacheRule( str ) {
	if (str === null || str === undefined) {
		return shortHands.none;
	}

	if ( !isNaN(Number(str)) ) {
		return parseInt( str, 10 );
	}

	str = str.trim().replace(/\,/gi, '').replace(/s$/i,'').toLowerCase();

	var split = str.split(/\s/g);

	try{
		if ( shortHands.hasOwnProperty(split[0]) ) {
			return shortHands[str];
		} else if ( /^\d+\s+\w+/.test(str) && split[1] && durations.hasOwnProperty(split[1]) ) {
			var num = Number( split[0] );
			if ( isNaN(num) ) {
				return shortHands.none;
			}
			console.log('WW', num, durations.hasOwnProperty(split[1]), split[1]);
			return num * durations[split[1]];
		} else {
			return shortHands.none;
		}
	} catch(err) {
		return 0;
	}
}
