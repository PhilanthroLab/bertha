var ActivityMonitor = module.exports = function ActivityMonitor( queue ) {

	var prefix = queue.constructor.name + '::';

	function l(name){
		return function(a, b) {
			console.log(prefix, name, a, b);
		};
	}

	function err(name) {
		return function( e, a ) {
			if (!e) {
				console.log(prefix, name, 'Unknown error', '\n\n', a);
				return;
			}

			console.log(e.message, '\n', e.stack, '\n');
		};
	}

	var events = process.env.MONITOR_QUEUE_EVENTS ? process.env.MONITOR_QUEUE_EVENTS.split(/,\s*/g) : ['succeed', 'shift', 'unshift', 'running', 'idle'],
		errorEvents = process.env.MONITOR_QUEUE_ERRORS ? process.env.MONITOR_QUEUE_ERRORS.split(/,\s*/g) : ['error', 'fail'];

	events.forEach(function(n){
		queue.on(n, l(n));
	});

	errorEvents.forEach(function(n){
		queue.on(n, err(n));
	});
};
