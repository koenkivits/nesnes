var palette = require("./palette");

function VideoOutput() {
	this.initData();
	this.initPalette();
}

VideoOutput.prototype = {
	/**
	 * Connect video output to a Canvas DOM element.
	 */
	setElement: function( el ) {
		this.el = el;
	},

	/**
	 * Start 'live stream' of video output to canvas.
	 */
	run: function() {
		var el = this.el,
		    context = el.getContext("2d"),
		    image = context.getImageData( 0, 0, 256, 240 ),
		    imageData = image.data,
		    myData = this.data;

		requestAnimationFrame(function flush() {
			imageData.set( myData );
			context.putImageData( image, 0, 0 );

			requestAnimationFrame( flush );
		});
	},

	/**
	 * Reset output pixel position.
	 */
	reset: function() {
		this.index = 0;
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
	 * Output a single pixel.
	 * Actual color being displayed depends on palette being used.
	 * @see initPalette
	 */
	outputPixel: function( color ) {
		this.data[ this.index ] = this.reds[ color ];
		this.data[ this.index + 1] = this.greens[ color ];
		this.data[ this.index + 2] = this.blues[ color ];

		this.index += 4;
	},

	/**
	 * Initialize the video output.
	 */
	initData: function() {
		this.width = 256;
		this.height = 224;
		this.data = new Uint8Array( this.width * this.height * 4 );

		for ( var i = 0; i < this.data.length; i++  ) {
			this.data[ i ] = 0xff;
		}

		this.index = 0;
	},

	/**
	 * Initialize palette for video output.
	 */
	initPalette: function() {
		var color = 0,
		    i = 0,
		    address = 0,
		    view = palette.data,
		    buffer = new ArrayBuffer( 0xc0 ),
		    splitPalette = new Uint8Array( buffer );

		// first, re-arrange RGB values in a single array (first reds, then blues, then greens)
		for ( color = 0; color < 3; color +=1 ) {
			for ( i = 0; i < 192; i += 3 ) {
				splitPalette[ address ] = view[ i + color ];
				address += 1;
			}
		}

		// then, make color values separately available in separate arrays:
		this.palette = view;
		this.reds = new Uint8Array( buffer, 0, 0x40 );
		this.greens = new Uint8Array( buffer, 0x40, 0x40 );
		this.blues = new Uint8Array( buffer, 0x80, 0x40 );
	}
};

module.exports = VideoOutput;