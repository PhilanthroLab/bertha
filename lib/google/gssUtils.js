exports.parseSort = function parseSort( sort ) {

	sort = (sort || '').split(',');
	var result = {};

	sort.forEach(function( s, i ) {
		var column = s.replace(/^(\-|\+)/, '').toLowerCase(),
			direction = /^\-/.test(s) ? true : false;

		result[column] = { field: column, direction: direction };
	});

	return result;
};

exports.parseQuery = function parseQuery( query ) {

	query = (query || '').split(',');
	var result = {};

	query.forEach(function( q, i ) {
		// var column = s.replace(/^(\-|\+)/, ''),
		// direction = /^\-/.test(s) ? true : false;

		// result[column] = { field: column, direction: direction };
	});

	return result;
};

exports.pluckOptions = function pluckOptions( job ) {
	var opts = {};

	var sort = job.sort('sort');
	var query = job.sort('query');

	var sheetSorts = parseSort( sort ),
		sheetQueries = parseQuery( query );

	if ( sheetSorts ) {
		opts.sort = sheetSorts;
	}

	if ( sheetQueries ) {
		opts.query = sheetQueries;
	}

	return opts;
};