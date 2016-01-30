var WebGLRenderer = require( "./renderer/webgl" ),
    Canvas2DRenderer = require( "./renderer/canvas2d" );

function VideoOutput() {
	var width = 256,
	      height = 225,
	      length = width * height;

	this.pixelBuffer = new Uint8Array( length );
	this.bgBuffer = new Uint8Array( length );
	this.spriteBuffer = new Uint8Array( length );
	this.prioBuffer = new Uint8Array( length );

	this.index = 0;
	this.bgColor = 0;
}

VideoOutput.prototype = {
	force2D: false, // force 2d canvas rendering over WebGL

	/**
	 * 'run' method for WebGL mode.
	 */
	run: function() {
		var self = this;

		requestAnimationFrame(function flush() {
			requestAnimationFrame( flush );

			self.renderer.renderFrame( self );
		});		
	},

	/**
	 * Reset output pixel position.
	 */
	reset: function( bgColor ) {
		this.index = 0;
		this.bgColor = bgColor;
	},

	/**
	 * Set screen color intensity.
	 * TODO: actually support this.
	 */
	setIntensity: function( red, green, blue ) {
		// jshint unused: false
		// do nothing for now
	},

	/**
	 * Switch grayscale mode.
	 * TODO: actually support this.
	 */
	setGrayscale: function( grayscale ) {
		// jshint unused: false
		// do nothing for now
	},

	/**
	 * Output a scanline.
	 * @param {Uint8Array} background - Scanline background buffer
	 * @param {Uint8Array} sprites - Scanline sprite buffer
	 * @param {Uint8Array} priorities - Scanline sprite priority buffer
	 */
	outputScanline: function( background, sprites, priorities ) {
		this.bgBuffer.set( background, this.index );
		this.spriteBuffer.set( sprites, this.index );
		this.prioBuffer.set( priorities, this.index );
		this.index += 256;
	},

	/**
	 * Connect video output to a Canvas DOM element.
	 */
	setElement: function( el ) {
		this.el = el;	

		this.initRenderer();
	},

	/**
	 * Initialize renderer.
	 */
	initRenderer: function() {
		if ( !this.force2D && WebGLRenderer.isSupported( this.el ) ) {
			this.renderer = new WebGLRenderer( this.el );
		} else if ( Canvas2DRenderer.isSupported( this.el ) ) {
			this.renderer = new Canvas2DRenderer( this.el );
		} else {
			throw new Error( "No supported renderer!" );
		}
	}
};

module.exports = VideoOutput;