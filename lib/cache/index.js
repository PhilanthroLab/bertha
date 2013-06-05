var events		= require('events'),
	util		= require('util'),
	url			= require('url'),
	_			= require('underscore'),
	memjs		= require('memjs'),
	redisLib	= require("redis");

var connectionTimeMax = 1000 * 100;

function isCached( opts ) {

	opts.callCount = (opts.callCount || 0) + 1;

	if ( opts.callCount >= 3 ) {
		console.log('Reached call count');
		opts.error( new Error('Too many tries'), opts.key );
		return;
	}

	var redis = pool.getRedisConnection(),
		memc = pool.getMemcachedConnection();

	if ( !redis ) {
		var re = new Error( 'No connection to Redis.' );
		re.code = 503;
		throw re;
	}

	if ( !memc ) {
		var mcr = new Error( 'No connection to Memcached.' );
		mcr.code = 503;
		throw mcr;
	}

	opts.always( opts.key );
	opts.yes( {body:'body', etag:'123456', cache:'forever'}, opts.key );
	return;

	redis.hgetall(opts.key, function( redisErr, obj ) {

		if ( redisErr ) {
			opts.always( opts.key );
			opts.error( redisErr, opts.key );
			return;
		}
		
		if ( !obj ) {
			opts.always( opts.key );
			opts.no( wrapIsCached(opts), opts );
			return;
		}

		if ( opts.etag && opts.etag === obj.etag && typeof opts.notModified === 'function' ) {
			opts.always( opts.key );
			opts.notModified( opts.key );
			return;
		}

		memc.get(opts.key, function( cacheErr, body, extras ) {
			if ( cacheErr ) {
				opts.always( opts.key );
				opts.error( cacheErr, opts.key );
				return;
			}

			if ( body ){
				obj.body = body;
				opts.always( opts.key );
				opts.yes( obj, opts.key );
			} else {
				opts.always( opts.key );
				opts.no( wrapIsCached(opts), opts );
			}
		});

	});

	return this;
}

function wrapIsCached( opts ) {
	return function() {
		isCached( opts );
	};
}

function purgeCache( msg, queue, callback ) {

	var redis = pool.getRedisConnection(),
			memcached = pool.getMemcachedConnection();

	var m = msg.split(':');

	m[3] = '*';

	msg = m.join(':');

	redis.keys(msg, function(err, keys) {
		if ( err ) {
			callback( err );
		}

		if (!keys || !keys.length) {
			callback( null, null, null );
			return;
		}

		var length = keys.length,
				counter = 0;

		keys.forEach(function(key, indx) {

			redis.del(key, function() {
				memcached['delete'](msg, function( cacheErr, doc ) {

					if ( cacheErr ) {
						callback( cacheErr, doc );
					}

					queue.remove(msg, function( queueErr, reply ) {
						counter += 1;
						if (counter === length) {
							callback( queueErr, doc, reply );
						}
					});

				});
			});
		});

	});

}


/**
* Redis connection convenience function
*
*/
function connectToRedis( timeout, name ) {
	
	name = name || 'Unnamed';

	var defaultRedisURL = 'redis://127.0.0.1:6379',
		redisURL = url.parse(process.env.REDIS_URL_NAME ? process.env[process.env.REDIS_URL_NAME] : defaultRedisURL);

	var connection = redisLib.createClient( redisURL.port, redisURL.hostname, {no_ready_check: true} );

	if ( redisURL.auth ) {
		connection.auth(redisURL.auth.split(":")[1]);
	}

	connection.on('error', function( err ) {
		console.error( "Redis Error: " + name + '\n', err );
		process.exit( 1 );
	});

	var hasStartedOk = false;

	connection.on('connect', function() {
		console.log( 'Redis connection begun: ' + name );
		hasStartedOk = true;
	});

	connection.on('end', function() {
		console.log( 'Redis connection ended: ' + name );
	});

	setTimeout(function() {

		if ( hasStartedOk ) {
			return;
		}

		console.log( 'Startup timed out on Redis connection : ' + name );
		process.exit( 1 );

	}, timeout || 10000);

	return connection;
}

function connectToMemcached( timeout ) {
	var connection =  memjs.Client.create( null, { timeout:1, retries:3 });

	function handleCacheError( err ) {
		var isErrorOk = false;
		if ( isErrorOk ) {
			return;
		}
		console.error( 'Cache error detected', err.message, err.stack );
		process.exit( 1 );
	}

	// Wait for all cache servers to be available or just one
	// var remainingServers = cache.servers.length;
	var remainingServers = 1;

	var hasStartedOk = false;

	try{
		
		for (var serverKey in connection.servers) {
			connection.servers[serverKey].on('error', handleCacheError);
		}

		connection.stats(function( err, connectionDetails, result ){
			console.log('Memcached stats', err, connectionDetails);

			if ( err ) {
				return;
			}

			remainingServers -= 1;

			if ( !remainingServers ) {
				hasStartedOk = true;
			}
		});

	} catch ( e ) {
		console.error( e.message, e.stack );
		process.exit( 1 );
	}


	setTimeout(function() {

		if ( hasStartedOk ) {
			return;
		}

		console.log( 'Startup timed out on memchached connection' );
		process.exit( 1 );

	}, timeout || connectionTimeMax);

	return connection;
}

var connections = {
	publish:null,
	subscribe:null,
	normalRedis:null,
	memcached: null
};

var pool = {

	getPubishConnection: function( timeout ) {
		if ( !connections.publish ) {
			connections.publish = connectToRedis( timeout || connectionTimeMax, 'Redis Publish Client' );
		}

		return connections.publish;
	},

	getSubscribeConnection: function( timeout ) {
		if ( !connections.subscribe ) {
			connections.subscribe = connectToRedis( timeout || connectionTimeMax, 'Redis Subscribe Client' );
		}

		return connections.subscribe;
	},

	getRedisConnection: function( timeout ) {
		if ( !connections.normalRedis ) {
			connections.normalRedis = connectToRedis( timeout || connectionTimeMax, 'Default Redis Client' );
		}

		return connections.normalRedis;
	},

	getMemcachedConnection: function( timeout ) {
		if ( !connections.memcached ) {
			connections.memcached = connectToMemcached( timeout || connectionTimeMax, 'Memcached Client' );
		}

		return connections.memcached;
	},

	disconnectAll: function( callback ) {

		// Disconnecting often causes errors. 
		// e.g. "TypeError: undefined is not a function at Server.error (/app/node_modules/memjs/lib/memjs/server.js:43:30)"
		//
		// Seems to be a problem with
		// the client. It's not clear how necessary it is to close the connection
		// to Memcached so we'll do without this step for now.
		// if ( connections.memcached ) {
		// 	connections.memcached.close();
		// }

		var conns = [];

		if ( connections.publish ) {
			conns.push( connections.publish );
		}

		if ( connections.subscribe ) {
			conns.push( connections.subscribe );
		}

		if ( connections.normalRedis ) {
			conns.push( connections.normalRedis );
		}

		callback = _.after( conns.length, callback || function(){} );

		conns.forEach(function( c, i ){
			c.on( 'end', callback).quit();
		});
		
	},

	killAll: function() {
		try {
			if ( connections.publish ) {
				connections.publish.end();
			}

			if ( connections.subscribe ) {
				connections.subscribe.end();
			}

			if ( connections.normalRedis ) {
				connections.normalRedis.end();
			}
		} catch (e) {
			console.log('Error killing Redis connections');
		}
	}
};

// TODO: why do we need to do this? - cant Memcache be lazy connected?
pool.getMemcachedConnection();

exports.pool = pool;
exports.isCached = isCached;
exports.purgeCache = purgeCache;
exports.parseMessage = memjs.Utils.parseMessage;
