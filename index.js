var CPU = require("./system/cpu");
var APU = require("./system/apu");
var PPU = require("./system/ppu");
var Cartridge = require("./system/cartridge");
var Controllers = require("./system/controllers");
var Output = require("./system/output");
var Memory = require("./system/memory");
var utils = require("./utils");
var Input = require("./system/input");

var config = require("./config.json");

function System( el ) {
	this.config = config;

	// system timing flags
	this.frameEnded = false;
	this.tickAPU = false;

	// IO
	this.controllers = new Controllers();
	this.input = new Input( this );
	this.output = new Output();

	// video output
	if ( el ) {
		this.output.video.setElement( el );
	}

	// reserve for timing
	this.interval = null;
	this.running = false;
	this.paused = true;

	// reserve for system core
	this.cartridge = null;
	this.cpu = null;
	this.apu = null;
	this.ppu = null;
	this.memory = null;

	Object.preventExtensions( this );
}

System.prototype = {
	/**
	 * Load a ROM and optionally run it.
	 * @param {string} filename - Path of ROM to run.
	 * @param autorun - If true, run ROM when loaded. If a function, call that function.
	 */
	load: function( filename, autorun ) {
		var self = this;

		utils.readFile( filename, function( data ) {
			self.initCartridge( data );

			if ( typeof autorun === "function" ) {
				autorun();
			} else if ( autorun === true ) {
				self.run();
			}
		});
	},

	/**
	 * Turn on and run emulator.
	 */
	run: function() {
		if ( this.interval ) {
			// once is enough
			return;
		}

		var self = this;
		this.interval = setInterval( function() {
			if ( !self.paused) {
				self.runFrame();
			}
		}, 1000 / 60 );

		this.output.video.run();

		this.running = true;
		this.paused = false;
	},

	/**
	 * Run a single frame (1/60s NTCS, 1/50s PAL).
	 */
	runFrame: function() {
		var cpu = this.cpu,
		    ppu = this.ppu,
		    apu = this.apu;

		while ( !ppu.frameEnded ) {
			cpu.tick();

			ppu.tick();
			ppu.tick();
			ppu.tick();

			if ( this.tickAPU ) {
				apu.tick();
			}
			this.tickAPU = !this.tickAPU;
		}

		ppu.frameEnded = false;
	},

	/**
	 * Synchronously simulate running for a number of milliseconds.
	 * @param {number} milliseconds - The number of milliseconds to simulate.
	 */
	simulate: function( milliseconds ) {
		var i,
		    frames = ( milliseconds / 1000 ) * 60;

		for ( i = 0; i < frames; i++ ) {
			this.runFrame();
		}
	},

	/**
	 * Resume running.
	 */
	play: function() {
		this.paused = false;

		if ( !this.running ) {
			this.run();
		}
	},

	/**
	 * Stop running.
	 */
	pause: function() {
		this.paused = true;
	},

	/**
	 * On/off switch.
	 */
	toggle: function() {
		if ( this.paused ) {
			this.play();
		} else {
			this.pause();
		}

		return this.paused;
	},

	/**
	 * Initialize cartridge and hook into system.
	 */
	initCartridge: function( data ) {
		this.cartridge = new Cartridge( data, this );
	
		this.initCore();
		this.reset();
	},

	loadCartridge: function( cartridge ) {
		//this.cartridge = cartridge;
		this.memory.loadCartridge( cartridge );
		this.ppu.memory.loadCartridge( cartridge );
	},

	/**
	 * Initialize the core of our emulator (processor etc).
	 */
	initCore: function() {
		this.cpu = new CPU( this );
		this.apu = new APU( this );
		this.ppu = new PPU( this );
		this.memory = new Memory( this );

		this.loadCartridge( this.cartridge );
	},

	/**
	 * Reset the console.
	 */
	reset: function() {
		this.cpu.reset();
		this.apu.reset();
	}
};

module.exports = System;