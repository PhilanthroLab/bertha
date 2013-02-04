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
			console.log(prefix, name, e.message, e.stack, '\n\n', a, e.code);
		};
	}

	var events = ['shift', 'unshift', 'succeed', 'running', 'idle'],
		errorEvents = ['error', 'fail'];

	events.forEach(function(n){
		queue.on(n, l(n));
	});

	errorEvents.forEach(function(n){
		queue.on(n, err(n));
	});
};
