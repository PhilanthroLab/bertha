var queueing	= require('../queue'),
	_			= require('underscore');


var defaultOptions = {
	queueName: process.env.QUEUE || 'publish'
};

exports.create = function create( options, callback ) {

	options = _.extend( {}, defaultOptions, options );
	callback = callback || function() {};

	var q = new queueing.Queue( options.queueName );

	if ( !process.env.NODE_ENV || process.env.NODE_ENV == 'development' ) {
		q.on('fail', function( err ){
			console.error( err.message, '\r', err.stack );
		});
	}
	
	q.once('running', function( success ){
		callback.call( q, options, success );
	});

	q.start();

	return q;

};
