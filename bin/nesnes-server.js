#!/usr/bin/env node

var Server = require( "../server" );

var argv = process.argv.slice( 2 );
var server = new Server( argv[ 0 ], argv[ 1 ], argv[ 2 ] );
server.run();