var cache = require('../cache');


var responseTypes = {
	'text': 'text/plain',
	'html': 'text/html',
	'csv': 'text/csv',
	'tsv': 'text/tsv',
	'js': 'text/javascript'
};

exports.respond = function respond() {

	return function ( req, res ) {

		console.log('>> 2 [Do View]', req.plugin.message, req.requestId);

		var onError = sendError.bind( res ),
		onSuccess = sendJSON.bind( res ),
		onNotModified = notModified.bind( res ),
		msg = req.plugin.message,
		timedout = false;

		var to = setTimeout(function(){
			timedout = true;
			console.error('Timeout', 'key=' + msg, 'requestId=' + req.requestId);
			var nf = new Error('Timed out');
			nf.code = 408;
			onError( nf );
		}, 15000);

		var opts = {
			key: msg,
			etag: req.get('If-None-Match'),
			lastModified: req.get('If-Modified-Since'),
			notModified: onNotModified,
			no: enqueue( req.queue ),
			yes: function(doc, key) {
				if (!timedout) {
					onSuccess(doc, key);
				}
			},
			error: function(err, key) {
				clearTimeout(to);
				onError(err, key);
			},
			always: function( key ) {
				clearTimeout( to );
			}
		};

		try {
			cache.isCached( opts );
		} catch (err) {
			clearTimeout( to );
			onError( err );
		}
	}

};

function setCachingHeaders(req, resp, doc) {

	var undefinedCacheLength = !doc.cache && doc.cache !== 0;
	var cache = doc.cache;
	var year = 31536000;
	var sMaxAgeDefault = 60;
	var cacheLength = parseCacheRule( cache ) || 0;
	var sMaxAge;

	if (undefinedCacheLength) {
		sMaxAge = sMaxAgeDefault;
	} else {
		sMaxAge = cacheLength < sMaxAgeDefault ? cacheLength : sMaxAgeDefault;
	}

	if ( !resp.get('Cache-Control') ) {
		resp.set( 'Cache-Control', 'public, proxy-revalidate, s-maxage=' + sMaxAge + ', max-age=' + Math.min(cacheLength, year) );
		resp.set( 'Surrogate-Control', 'max-age=' + sMaxAge);
	}

	if ( !resp.get('ETag') && doc.etag ) {
		resp.set( 'ETag', doc.etag );
	}

	if (!resp.get('Last-Modified') && doc.lastModified) {
		resp.set( 'Last-Modified', doc.lastModified );
	}
}

function notModified( doc, key ) {
	setCachingHeaders(this.req, this, doc);
	this.send( 304 );
}

function enqueue( queueClient ) {
	return function( tryAgain, opts ) {

		function evtHandler( evt, result, data ) {
			if ( evt === 'succeed' ) {
				console.log('>> 8 [Notify]', opts.key);
				tryAgain();
				return;
			}

			opts.error( result );
		}

		function pushCallback( redisErr ) {
			if ( redisErr ) {
				queueClient.removeListener( opts.key, evtHandler );
				opts.error( redisErr );
				return;
			}
			console.log('>> 5.5 [Push]', opts.key);
		}
		console.log('>> 5 [Queue]', opts.key);
		queueClient.once(opts.key, evtHandler).push(opts.key, pushCallback);
	};
}

function sendError( err, a, b ) {
	console.error('Error', 'code=' + err.code, 'requestId=' + this.req.requestId, 'message=' + err.message);
	this.jsonp(err.code || 404, {message:err.message});
}

function sendJSON( doc ) {
	var resp = this;
	var req = resp.req;

	setCachingHeaders(req, resp, doc);

	resp.charset = doc.charset || resp.charset || 'utf-8';

	var callbackName;

	var type = doc.type;

	if (type === 'json') {
		callbackName = req.query[resp.app.get('jsonp callback name')];

		if ( typeof callbackName === 'string' && /[A-Za-z0-9_\.]+/.test(callbackName) ) {
			// copied from express.js response implementation
			resp.set('Content-Type', responseTypes.js);
			doc.body.toString().replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
			callbackName = callbackName.replace(/[^\[\]\w$.]/g, '');
			doc.body = '/**/ typeof ' + callbackName + ' === \'function\' && ' + callbackName + '(' + doc.body + ');';

			// Rosetta Flash security vulnerability fix requires this header
			resp.set('X-Content-Type-Options', 'nosniff');
		} else {
			resp.set('Content-Type', 'application/json');
		}
	} else if (type in responseTypes) {
			resp.set('Content-Type', responseTypes[type]);
	} else {
			resp.set('Content-Type', responseTypes.text);
	}

	resp.send(200, doc.body);
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
		} else if ( /^\d+(\s?)+[a-z]+$/.test(str) && split[1] && durations.hasOwnProperty(split[1]) ) {
			var num = Number( split[0] );
			if ( isNaN(num) ) {
				return shortHands.none;
			}
			return num * durations[split[1]];
		} else {
			return shortHands.none;
		}
	} catch(err) {
		return 0;
	}
}
