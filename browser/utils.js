exports.readFile = function( filename, callback ) {
	var xhr = new XMLHttpRequest();
	xhr.open( "GET", filename );
	xhr.responseType = "arraybuffer";

	xhr.onload = function() {
		callback( xhr.response );
	};

	xhr.onerror = function( e ) {
		throw e;
	};

	xhr.send( null );
};