var palette = require("./palette").data;

function Canvas2DRenderer( el ) {
	this.el = el;

	this.initData();
	this.initPalette();
}

Canvas2DRenderer.isSupported = function( el ) {
	return !!getContext( el );
};

Canvas2DRenderer.prototype = {
	renderFrame: function( output ) {
		var bgBuffer = output.bgBuffer,
		    spriteBuffer = output.spriteBuffer,
		    prioBuffer = output.prioBuffer,
		    bgColor = output.bgColor,

		    reds = this.reds,
		    greens = this.greens,
		    blues = this.blues,

		    end = bgBuffer.length;
		    data = this.data;

		var pixelIndex = 0,
			outputIndex = 0,
			color = 0;

		for ( ; pixelIndex < end; pixelIndex++ ) {
			color = bgBuffer[ pixelIndex ];
			if ( spriteBuffer[ pixelIndex ] && !( prioBuffer[ pixelIndex ] && color ) ) {
				color = spriteBuffer[ pixelIndex ];
			}
			color = ( color || bgColor );

			data[ outputIndex++ ] = reds[ color ];
			data[ outputIndex++ ] = greens[ color ];
			data[ outputIndex++ ] = blues[ color ];
			outputIndex++; // skip alpha channel
		}

		this.image.data.set( data );
		this.context.putImageData( this.image, 0, 0 );
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

		this.context = getContext( this.el );
		this.image = this.context.getImageData( 0, 0, this.width, this.height );

		this.index = 0;
	},

	/**
	 * Initialize palette for video output.
	 */
	initPalette: function() {
		var color = 0,
		    i = 0,
		    address = 0,
		    view = palette,
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

function getContext( el ) {
	return el.getContext( "2d" );
}

module.exports = Canvas2DRenderer;