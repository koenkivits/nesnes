var fs = require("fs");

/**
 * Wrapper around fs.readFile to make it easily replaceble by Browserify and to
 * handle converting to an ArrayBuffer in a single place.
 */
exports.readFile = function( filename, callback ) {
	fs.readFile( filename, function( err, data ) {
		if ( err ) {
			throw err;
		}

		var buffer = new Uint8Array( data ).buffer;
		callback( buffer );
	});
};