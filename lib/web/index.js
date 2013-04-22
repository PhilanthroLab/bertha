if( process.env.NODEFLY_APPLICATION_KEY ) {
	require('nodefly').profile(
		process.env.NODEFLY_APPLICATION_KEY,
		[process.env.APPLICATION_NAME, 'Bertha']
	);
}

var app		= require('./app'),
	cache	= require('../cache'),
	monitor = require('../queue/monitor.js');


var cleanupMax = 1000 * 10, // 10 secs

	appStartMax = 1000 * 30; // 30 secs


var cleanupTimeout = null;

function cleanup( code ) {

	function cleanupDone() {
		clearTimeout( cleanupTimeout );
		console.log( 'Graceful Shutdown done.' );
		process.exit( code );
	}

	if ( !cleanupTimeout ) {
		cleanupTimeout = setTimeout(function(){

			console.log( 'Took to long try to gracefully shutdown - killed instead!' );
			cache.pool.killAll();
			process.exit( 1 );
		}, cleanupMax);
	}

	cache.pool.disconnectAll(function(){
		cleanupDone();
	});
}

process.on('SIGINT', function() {
	console.log( 'Handling SIGINIT' );
	cleanup( 0 );
});

process.on('SIGTERM', function() {
	console.log( 'Handling SIGTERM' );
	cleanup( 0 );
});

process.on('SIGHUP', function() {
	console.log( 'Handling SIGHUP' );
	cleanup( 0 );
});

process.on('uncaugthException', function( err ){
	console.log( 'UNCAUGHT WORKER EXCEPTION:\n', err.message, '\n', err.stack );
	cleanup( 1 );
});


var appStartTimeout = setTimeout(function( scope ) {

	console.log('Web app Startup timeout');
	process.next( cleanup.bind(scope, 1) );

}, appStartMax, this);

// you can override settings using this opts object
var opts = {};

	app

	// the callback to the create function is passed the options object after its been
	// filled in with default and environmental settings.
	.create( opts /*, callback */)

	// Actually start the server listening
	// 'this' in the callback is the express app
	.start(function(){

		clearTimeout( appStartTimeout );

		if ( process.env.NODE_ENV === 'development' ) {
			var activityMonitor = new monitor( this );
		}

		console.log('Started Web node. Listening on port %d', this.get('port'));

	});
