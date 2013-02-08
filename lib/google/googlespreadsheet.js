/*

User's list of spreadsheets: https://spreadsheets.google.com/feeds/spreadsheets/private/full
List all the sheets in a spreadsheet: https://spreadsheets.google.com/feeds/worksheets/key/private/full
A Sheet's Data in "list" form: https://spreadsheets.google.com/feeds/list/key/worksheetId/private/full

*/

var googleAuth  = require('./googleAuth.js'),
    request     = require('request'),
    _           = require('underscore'),
    moment      = require('moment');


var Api = function Api( options ) {
  this.username = options.username;
  this.password = options.password;
  this.auth = null;
};


var baseURL     = 'https://spreadsheets.google.com/feeds',

    visibilities = Api.visibilities = {
      'private':'private',
      'public':'public'
    },

    projections = Api.projections ={
      'full': 'full',
      'basic': 'basic'
    },

    feeds = Api.feeds = {
      'spreadsheets': 'spreadsheets',
      'spreadsheet': 'spreadsheet',
      'worksheets': 'worksheets',
      'list': 'list',
      'cells': 'cells'
    };

module.exports = function ( options ) {
  return new Api( options );
};


var defaultOpts = {
    feed: feeds.worksheets,
    visibility: visibilities['private'],
    projection: projections['full']
};


Api.prototype.refreshAuth = function refreshAuth( callback ) {
  this.auth = googleAuth.authSpreadsheetAPI(this.username, this.password, function(){
    console.log('Authenticated with Google');
    callback();
  }, function(){
    console.log('Authentication Failed at Google');
    callback();
  });
  this.auth.login();
};

Api.prototype.getRequestHeaders = function getRequestHeaders() {
  return {
    'Authorization': "GoogleLogin auth=" + this.auth.getAuthId(),
    'GData-Version': "3.0"
  };
};

Api.prototype.isAuthStale = function isAuthStale() {
  // TODO: implement Stale Authentication logic
  // TODO: implement timout on Auth - dump the auth details every 12 hours or something
  return !this.auth;
};

Api.prototype.request = function( opts, callback ) {

  var self = this;

  opts = _.extend( {}, defaultOpts, opts );

  function onResponse (err, response, body) {
    //TODO: if auth error retry a couple of times
    if ( err ) {
      callback.call( self, err, null );
      return;
    }

    try {
      var data = JSON.parse( body );
      callback.call( self, err, data );
    } catch ( parseError ) {
      callback.call( self, parseError, null );
    }
  }

  function builURL() {
    var url = baseURL + '/' + opts.feed;

    if ( opts.feed !== feeds.spreadsheets ) {
      url += '/' + opts.spreadsheetKey;
    }

    if ( opts.feed === feeds.list || opts.feeds === feeds.cells ) {
      url += '/' + opts.worksheetId;
    }

    if ( opts.feed !== feeds.spreadsheet ) {
      url += '/' + opts.visibility + '/' + opts.projection;
    }
    
    return url + '?alt=json';
  }

  function send() {
    request({ url: builURL(), headers: self.getRequestHeaders()}, onResponse );
  }

  if ( this.isAuthStale() ) {
    this.refreshAuth( send );
  } else {
    send();
  }

};

Api.prototype.spreadsheet = function( key ) {
  return new Spreadsheet( key, this );
};


var Spreadsheet = function Spreadsheet( spreadsheetKey, requestFactory ) {
  this.key = spreadsheetKey;
  this.sheetsByID = {};
  this.sheetsByName = {};
  this.requestFactory = requestFactory;
  this.gotMetadata = false;
  this.metadataError = null;
};

Spreadsheet.prototype.fetchWorksheetFeed = function fetchWorksheetFeed( callback ) {

    callback = callback || function(){};

  if ( this.metadataError) {
    console.log('Previously found error in that spreadsheet');
    callback( this.metadataError, null );
    return;
  }

  var self = this;

  var opts = {
    feed: feeds.worksheets,
    projection: projections['full'],
    visibilities: visibilities['private'],
    spreadsheetKey: this.key
  };

  this.requestFactory.request( opts, function( err, result ) {
    
    this.gotMetadata = true;

    if ( err ) {
      this.metadataError = err;
      callback( err, result );
      return;
    }

    result.feed.entry.forEach(function(n,i){
      n.sheetId = n.id.$t.substr(n.id.$t.lastIndexOf('/') + 1);
      n.sheetName = n.title.$t;
      var sheet = {details: n, data: null};
      self.sheetsByID[n.sheetId] = sheet;
      self.sheetsByName[n.sheetName] = sheet;
    });

    callback(null, result);
  });
};

Spreadsheet.prototype.fetchSheetDataListFeed = function fetchSheetDataListFeed( sheetNames, callback ) {

  var self = this;

  if ( this.metadataError) {
    console.log('Previously found error in that spreadsheet');
    callback( this.metadataError, null );
    return;
  }

  if ( typeof sheetNames === 'string ') {
    sheetNames = [sheetNames];
  }

  var defs = {
        feed: feeds.list,
        projection: projections['full'],
        visibilities: visibilities['private'],
        worksheetId: null,
        spreadsheetKey: self.key
      },
      success = _.after(sheetNames.length, callback),
      fail = callback,
      data = {};


  if ( !this.gotMetadata ) {
    this.fetchWorksheetFeed(function( err, result){
      if ( err) {
        fail( err );
      }
      fetchSheets();
    });
  } else {
    fetchSheets();
  }

  function fetchSheets() {
    
      var allAvailable = true, indx = sheetNames.length, errSheetNames = [];

      // Are the sheets specified available?
      while( indx-- ) {
        if ( !self.sheetsByName.hasOwnProperty(sheetNames[indx]) ) {
          allAvailable = false;
          errSheetNames.push(sheetNames[indx]);
        }
      }

      if ( !allAvailable ) {
        var sheetsNotFoundError = new Error( 'Worksheets not found: ' +  errSheetNames.join(', ') + '.' ); // todo: say which sheets couldnt be found
        sheetsNotFoundError.code = 404;
        fail( sheetsNotFoundError );
        return;
      }


      sheetNames.forEach(function( name, i ) {

        var o = _.extend( {}, defs),
            sheet = self.sheetsByName[name];

        o.worksheetId = sheet.details.sheetId;

        self.requestFactory.request( o, function( listErr, result ) {

            if ( listErr ) {
              fail( listErr );
              return;
            }

            data[name] = processSheet( result );

            success( null, data );
        });

      });
  }
};

function processSheet( result ) {

    var rows = result.feed.entry;

    if ( !rows || !rows.length ) {
      return [];
    }

    var first = rows[0],
        processor = createRowProcessor( first );

    return processor.processRows( rows );
}

function parseBasicValue( val ){
  val = val || '';

  val = val.trim();

  var res,
      bool = parseBoolean( val ),
      num = Number(val.replace(/\,/g, ''));

    if ( typeof val === 'string' && val.length === 0 ) {
      return null;
    }

    if (typeof bool === 'boolean') {
      res = bool;
    } else if ( !isNaN(num) ) {
      res = num;
    } else if (typeof val === 'string') {
      res = val;
    }

    return res;
}

function parseList( val, delimiter ) {
  val = val || '';
  val = val.trim();
  return !val.length ? [] : val.toString().split(delimiter || ',').map(parseBasicValue);
}

function parseArray( val ) {
  return parseList( val, /\r?\n/gm);
}

function parseBoolean( val ) {
  val = val || '';
  var bool;
  try{
    if ( /^(y|yes|true)$/i.test(val) ) {
      bool = true;
    } else if ( /^(n|no|false)$/i.test(val) ) {
      bool = false;
    }
  } catch(e){}
  return bool;
}

function parseDate( val ) {
  if ( !val ) {
    return null;
  }

  var d = moment( val );
  if ( d.isValid() ) {
    return d.utc().toDate().toISOString();
  }
  return val;
}

function parseDateRange( val ) {
  return val;
}

function parseLink( cellContent ) {
  cellContent = cellContent || '';
  var arr = parseArray( cellContent ), links = [];
  arr.forEach(function(n,i){
    if (!n) {
      return;
    }
    var pair = n.split(/\s(?=https?\:\/\/)/),
        obj = {
          text: pair[0],
          href: pair.length > 1 ? pair[1] : pair[0]
        };

    links.push( obj );
  });
  return links;
}

function parseCurrency( val ) {
  if ( typeof val === 'string' && val.length === 0 ) {
      val = null;
  }

  return {value:val,symbol:val};
}

function createRowProcessor( row ) {

  if ( !row ) {
    throw new Error( 'Could not create a Row Processor without any data as a basis.' );
  }
  
  // we done want to effect the actual row data so take a clone
  row = _.clone(row);
  
  var cols = {},
      c,
      src = [],
      fnNamePattern = /\.{2}(?=\w+$)/i,
      namespacePattern = /\w+\.\w+/g,
      isSpecial = /^special\./i,
      columnFnName,
      now ;

  if ( row['gsx$special.restrict'] ) {
    src.push("if ( /^(y|yes|true|ok|on)$/i.test(e['gsx$special.restrict'].$t) ) {return null;}");
    delete row['gsx$special.restrict'];
  }

  if ( row['gsx$special.embargo'] ) {
    
    now = moment().utc().toDate().getTime() + 1000; // add 1000 milliseconds just to be safe in case of time rounding (leap seconds).

    // TODO: embargo dates should setup a future purge of this document from the cache
    src.push("var embargoDate = this.moment(e['gsx$special.embargo'].$t)");
    src.push("if ( embargoDate && embargoDate.isValid() && embargoDate.utc().toDate().getTime() > "+ now +" ) {return null;}");
    delete row['gsx$special.embargo'];
  }

  var namespace, lastName;

  function iterateNamespace( nm, ind ) {
    if (!nm || nm === '.') return;
    var p = this.slice(0, ind + 1).join('"]["');
    src.push('o["' + p + '"] = o["' + p + '"] || {}');
  }

  for (var name in row) {
    c = name.split('$');
    
    if ( c[0] == 'gsx' && c[1] && !isSpecial.test(c[1]) ) {

        namespace = (c[1].split(/(?=\.{2}\w+$)/i)[0]||'').split('.');
        lastName = null;

        while ( !lastName && namespace.length ) {
          lastName = namespace.pop();
          lastName = lastName === '.' ? null : lastName;
          console.log('loop  ', namespace.length, lastName);
        }
        
        if (namespace.length > 0) {
          namespace.forEach(iterateNamespace, namespace);
          namespace =  'o["' + namespace.join('"]["') + '"]';
          namespace = namespace.replace(/\[\"\"\]/g,'');
        } else {
          namespace = 'o';
        }


        src.push("e['" + name + "'].$t = (e['" + name + "'].$t || '').trim()");

        columnFnName = c[1].split( fnNamePattern );

        if ( columnFnName.length == 2 && types.hasOwnProperty(columnFnName[1])  ) {
          src.push(namespace + "['" + lastName + "'] = this.parse."+ columnFnName[1] +"(e['" + name + "'].$t)");
        } else {
          src.push(namespace + "['" + lastName + "'] = this.parse.basic(e['" + name + "'].$t)");
        }
    }
  }

  src.push('return o');

  var f = new Function('o', 'e', src.join(';')),
      context = {
          moment:moment,
          parse:types
      };

  return new RowProcessor( context, f );
}

var types = {
  basic: parseBasicValue,
  str: function( val ) {
    return (val || '').toString();
  },
  int: function( val ) {
    var res = parseInt( val, 10 );
    return isNaN(res) ? null : res;
  },
  dp1: function( val ) {
    if ( val == null ) {
      return null;
    }

    try {
      return val.toFixed(1);
    } catch (e) {
      return val;
    }
  },
  dp2: function( val ) {
    if ( val == null ) {
      return null;
    }

    try {
      return val.toFixed(2);
    } catch (e) {
      return val;
    }
  },
  dp3: function( val ){
    if ( val == null ) {
      return null;
    }

    try {
      return val.toFixed(3);
    } catch (e) {
      return val;
    }
  },
  date: parseDate,
  drange: parseDateRange,
  link: parseLink,
  curr: parseCurrency,
  list: parseList,
  arr: parseArray
};

var RowProcessor = function( context, fn ) {

  function iterator( row, indx ) {
    var processedRow = fn.call( context, {}, row );
    if ( processedRow ) {
        this.push( processedRow );
    }
  }

  this.processRows = function( rows ) {
    var result = [];
    
    rows.forEach( iterator, result );
    
    return result;
  };

};
