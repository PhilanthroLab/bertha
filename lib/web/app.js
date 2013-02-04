var Message = require('../message.js'),
    express = require('express'),
    http = require('http'),
	_ = require('underscore'),
	plugins = require('../plugins'),
	queueing = require('../queue'),
	view = require('./view.js'),
	purge = require('./purge.js');


var defaultOptions = {
	port: process.env.PORT || 3000,
	trustProxy: true,
	mode: process.env.NODE_ENV || 'production',
	docPath: '/view'
};

exports.create = function create( options, callback ) {

	options = _.extend( {}, defaultOptions, options );
	callback = callback || function(){};

	var app = express();

	if ( options.trustProxy ) {
		app.enable('trust proxy');
	}

	app.disable('x-powered-by');

	app.configure('development', function(){
		console.log( 'Configuring for Development mode' );

		// TODO: JSON error handler
		app.enable( 'verbose errors' );
		app.use( express.errorHandler() );

		// TODO: how to use the logger?
		app.use( express.logger('dev') );
	});

	app.configure('production', function(){

		console.log( 'Configuring for Production mode' );

		app.disable( 'verbose errors' );
		app.use( express.errorHandler() );
	});

	app.configure(function(){

		console.log( 'Standard configuration' );

		app.set( 'port', options.port );
		app.set( 'queueRegistry', queueRegistry );
		
		// TODO: serve 503 while redis and memcached connections are not available yet
		app.set( 'messageParsingFactory', plugins.getMessageHandler );
		
		app.param('queue', queue);
		app.param('plugin', plugin);

		app.use( express.favicon() );
		app.use( express.compress() );
		app.use( express.bodyParser() );
		app.use( express.methodOverride() );
		app.use( app.router );

		// Static resources not needed at the moment
		//app.use(express['static'](path.join(__dirname, 'public')));

		callback.call( app, options );
	});

	app.get( options.docPath + '/:queue/:plugin/:key', view.respond );
	app.get( options.docPath + '/:queue/:plugin/:key/:sheet', view.respond );
	app.get('/purge/:queue/:plugin/:key', purge.respond );
	app.get('/purge/:queue/:plugin/:key/:sheet', purge.respond );

	app.start = function( cb ) {
		var port = app.get('port');

		http.createServer( app ).listen(port, function(){
			cb.apply( app, arguments );
		});

		return app;
	};

	return app;
};


// TODO: do this properley. Implement multichannel queueing;
var availableQueues = {};
var defName = process.env.QUEUE || 'publish';
var defQueue = availableQueues[defName] = new queueing.QueueClient(defName);
defQueue.start();

function queueRegistry( name ) {
	return availableQueues[name];
}

function queue( req, res, next ) {

	var lookup = res.app.get('queueRegistry'),
		q = lookup( req.param('queue') );

	if ( !q ) {
		res.send(404);
		return;
	}

	req.queue = q;
	next();
}

function plugin( req, res, next ){

	var pluginName = req.param('plugin'),
		messageParser = res.app.get('messageParsingFactory')( pluginName );

	req.plugin = {
		name: pluginName,
		message: messageParser( req )
	};

	next();
}


