"use strict";

/*global console:false */

var fs = require( "fs" );
var path = require( "path" );
var http = require( "http" );
var url = require( "url" );

var rollup = require( "rollup" );
var rollupPluginJson = require( "rollup-plugin-json" );
var dot = require( "dot");
var Cartridge = require( "../dist/cartridge" );

const GAME_PATH = "/game/";
const ROM_PATH = "/rom/";

dot.templateSettings.strip = false;
const templateString = fs.readFileSync( path.join( __dirname, "/index.def" ) );
const template = dot.template( templateString );

/**
 * A basic server intended to only to serve an HTML page with NesNes included,
 * to be able to easily test ROMs and debug the emulator.
 */
class NesNesServer {
	/**
	 * Constructs a NesNesServer instance.
	 * @param {string} address - The (IP) address listen to.
	 * @param {number} port - The port to listen to.
	 * @param {string} directory - The directory to serve ROMs from.
	 */
	constructor( address, port, directory ) {
		this.address = address || "localhost";
		this.port = port || 8080;
		this.directory = directory || process.cwd();

		var info = fs.statSync( this.directory );
		if ( !info.isDirectory() ) {
			throw new Error("Not a directory!");
		}

		this._indexRoms();
	}

	/**
	 * Run this server.
	 */
	run() {
		var server = http.createServer(),
			context = this;

		server.listen(this.port, this.address);

		// output debug info on listening intialize
		server.on( "listening", function() {
			console.log( "Running server on " + context.address + ":" + context.port );
		} );

		// server either base HTML or ROMs on request
		server.on( "request", function(request, response) {
			var game,
			    path = url.parse(request.url).pathname;

			if ( path.startsWith( ROM_PATH ) ) {

				// ROM has been requested
				context._serveRom( response, path.substring( ROM_PATH.length ) );
			} else {

				// .. all other requests fall back to base HTML
				if ( path.startsWith( GAME_PATH) ) {
					game = path.substring( GAME_PATH.length );
				}
				context._serveHtml( response, game );
			}
		} );
	}

	/**
	 * Gather all ROMs from server directory and map them to mapper.
	 */
	_indexRoms() {
		var files = fs.readdirSync( this.directory ),
			context = this;

		this._mapperRoms = {};
		var romCount = 0;
		files.forEach( function( fileName ) {
			var contents, cartridge;
			var filePath = path.join( context.directory, fileName );
			var info = fs.statSync( filePath );

			if ( !info.isFile() ) {
				return;
			}

			try {

				// try to parse parse to determine if ROM is valid and to get mapper info
				contents = (
					new Uint8Array( fs.readFileSync( filePath ) )
				).buffer;
				cartridge = new Cartridge( contents );
			} catch (e) {

				// skip anything that isn't a valid NES ROM
				return;
			}

			context._indexRom( fileName, cartridge.mapper );
			romCount++;
		});

		console.log( "Found " + romCount + " ROMs in " + this.directory );
	}

	/**
	 * Register a single ROM.
	 * @param {string} fileName - The filename of the ROM to register.
	 * @param {number} mapper - The mapper ID to register the ROM to.
	 */
	_indexRom( name, mapper ) {
		if ( !( mapper in this._mapperRoms ) ) {
			this._mapperRoms[ mapper ] = [];
		}

		this._mapperRoms[ mapper ].push( name );
	}

	/**
	 * Write ROM data to HTTP response.
	 * @param {http.ServerResponse} response
	 * @param {string} fileName - File name of ROM to serve
	 */
	_serveRom( response, fileName ) {
		try {
			var romData = fs.readFileSync( path.join( this.directory, fileName ) );
			response.write( romData );
		} catch ( e ) {
			response.writeHead( 500 );
			response.write( e.toString() );
		}

		response.end();
	}

	/**
	 * Write base HTML page to HTTP response.
	 * Base HTML always contains freshly bundled NesNes build.
	 * @param {http.ServerResponse} response
	 * @param {string} fileName - File name of currently selected ROM
	 */
	_serveHtml( response, selectedRom ) {
		var html,
				context = this;

		// bundle NesNes build
		rollup
			.rollup( {
				entry: path.join( __dirname, "../index.js" ),
				plugins: [ rollupPluginJson() ],
			} )

			.then( function ( bundle ) {
				var script = bundle.generate( {
				format: 'iife',
				moduleName: 'NesNes',
				dest: 'dist/nesnes.js',
			} );

			// render and write HTML page
			html = template({
				pretty: true,
				cartridges: context._mapperRoms,
				selectedRom: selectedRom,
				script: script.code,

				GAME_PATH: GAME_PATH,
				ROM_PATH: ROM_PATH,
			});

			response.write(html);
			response.end();
		} )

		.catch( function( e ) {
			html = e.toString();
			response.write( html );
			response.end();
		} );
	}
}

module.exports = NesNesServer;