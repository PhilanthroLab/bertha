var factory = require('./lib/plugins');

var plugin = factory.getPlugin('example');

console.assert(plugin === plugin.work(), 'Plugin work method returns this');

var constructor = plugin.constructor.name;

console.assert(constructor === 'ExamplePlugin', 'Plugin constructor is not correct');

var pluginName = plugin.name;

console.assert(pluginName === 'example', 'Plugin name is not correct');






var plugin2 = factory.getPlugin('example2', {
	dirname: __dirname + '/plugins/basic'
});

console.assert(plugin2 === plugin2.work(), 'Plugin work method returns this');

var constructor2 = plugin2.constructor.name;

console.assert(constructor2 === 'BasicPlugin', 'Plugin constructor is not correct');

var pluginName2 = plugin2.name;

console.assert(pluginName2 === 'example2', 'Plugin name is not correctly overridden');

var pluginName2Original = plugin2.constructor.prototype.name;

console.log(pluginName2Original);

console.assert(pluginName2Original === 'basic', 'Plugin\'s prototype.name is not correct');
