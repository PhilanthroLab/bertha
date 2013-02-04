var daemon = require('./daemon.js'),
	cache = require('../cache'),
	monitor = require('../queue/monitor.js');

var cleanupMax = 1000 * 10, // 10 secs

	daemonStartMax = 1000 * 30; // 30 secs

var cleanupTimeout = null;

function cleanup ( code ) {

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

	// Now we can go for a graceful shutdown
	console.log( 'Attempting graceful shutdown.' );

	if ( daemonInstance ) {
		daemonInstance.once('running', function( isRunning ) {
			if ( !isRunning ) {
				cache.pool.disconnectAll(function(){
					cleanupDone();
				});
			}
		});
		daemonInstance.stop();
	}
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

var daemonStartTimeout = setTimeout(function( scope ) {

	console.log('Daemon Startup timeout');
	process.next( cleanup.bind(scope, 1) );

}, daemonStartMax, this);

var deamonOptions = {};

function onDaemonCreated( options, isRunning ) {

	if ( process.env.NODE_ENV === 'development' ) {
		var activityMonitor = new monitor( this );
	}

	if ( isRunning ) {
		console.log('Worker started');
		clearTimeout( daemonStartTimeout );
	}
}

var daemonInstance = daemon.create( deamonOptions, onDaemonCreated ).once( 'error', cleanup.bind(this, 1) );


