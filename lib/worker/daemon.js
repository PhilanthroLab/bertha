var queueing	= require('../queue'),
	_			= require('underscore');


var defaultOptions = {
	queueName: process.env.QUEUE || 'publish'
};

exports.create = function create( options, callback ) {

	options = _.extend( {}, defaultOptions, options );
	callback = callback || function() {};

	var q = new queueing.Queue( options.queueName );
	
	q.once('running', function( success ){
		callback.call( q, options, success );
	});

	q.start();

	return q;

};
