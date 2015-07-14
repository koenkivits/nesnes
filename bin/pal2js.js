/**
 * Converts a .pal palette file to a NodeJS module.
 */

var fs = require("fs");

var filename = process.argv[2];

if ( !filename ) {
	throw new Error("Supply .pal file!");
}

var buffer = fs.readFileSync(filename),
	glue = "";

write("exports.data = new Uint8Array([");
for ( var i = 0; i < buffer.length; i++ )  {
	write( glue + buffer[i] );
	glue = ",";
}
write("]);");

function write( str ) {
	process.stdout.write( str );
}