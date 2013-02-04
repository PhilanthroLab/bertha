var queueing = require('../lib/queue');

var q = new queueing.Queue('mychannel');

q.start();

var client = new queueing.QueueClient('mychannel');

client.start();

client.push('basic:doc');
client.push('basicx:doc');

process.on('uncaugthException', function(a,b,c){
	console.console.log('UNCAUGHT EXCEPTION:', a, b, c);
});

