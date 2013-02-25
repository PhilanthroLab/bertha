var parseSort = exports.parseSort = function parseSort( sort ) {

	sort = (sort || '').split(',');
	var result = {};
	sort.forEach(function( s, i ) {
		var sp = s.split( '_' );
		if ( sp && sp.length != 2) {
			return;
		}
		var sheet = sp[0],
			column = sp[1].replace(/^(\-|\+)/, '').toLowerCase(),
			direction = /^\-/.test(sp[1]) ? true : false;

		result[sheet] = { field: column, direction: direction };
	});
	return result;
};

var parseQuery = exports.parseQuery = function parseQuery( query ) {

	query = (query || '').split(',');
	var result = {};

	query.forEach(function( q, i ) {
		// var column = s.replace(/^(\-|\+)/, ''),
		// direction = /^\-/.test(s) ? true : false;

		// result[column] = { field: column, direction: direction };
	});

	return result;
};

var pluckOptions = exports.pluckOptions = function pluckOptions( job ) {
	var opts = {};

	var sort = job.get('sort');
	var query = job.get('query');

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