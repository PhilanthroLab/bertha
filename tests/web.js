var queueing = require('../lib/queue');

var q = new queueing.Queue('publish');

q.start();

var WebApp = require('../lib/web/index.js');

var a = new WebApp();

a.configure(function(){
	console.log('configured');
	a.startServer(function(){
		console.log('Started');
	});
});

