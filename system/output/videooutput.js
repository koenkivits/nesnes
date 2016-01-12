var palette = require("./palette");
const glMode = false;

function VideoOutput() {
	if ( glMode ) {
		this.initGL();
	} else {
		this.init2D();
	}
}

VideoOutput.prototype = {
	/**
	 * Connect video output to a Canvas DOM element.
	 */
	setElement: function( el ) {
		this.el = el;	

		this.initContext();
	},

	/**
	 * Initialize canvas 2D rendering.
	 */
	init2D: function() {
		this.initData();
		this.initPalette();

		this.initContext = this.init2DContext;
		this.run = this.run2D;
		this.outputPixel = this.outputPixel2D;
	},

	/**
	 * Initialize canvas WebGL rendering.
	 */
	initGL: function() {
		this.pixelBuffer = new Uint8Array( 256 * 224 );
		this.index = 0;

		this.initContext = this.initGLContext;
		this.run = this.runGL;
		this.outputPixel = this.outputPixelGL;
	},

	/**
	 * Initialize canvas 2D context.
	 */
	init2DContext: function() {
		this.context = this.el.getContext( "2d" );
	},

	/**
	 * Initialize canvas WebGL context.
	 */
	initGLContext: function() {
		const gl = this.context = this.el.getContext( "webgl" )
		gl.viewport( 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight );

		this.initShaders();
		this.initBuffers();
		this.initTextures();
	},

	/**
	 * Initialize the quad to draw to.
	 */
	initBuffers: function() {
		const gl = this.context;

		const buffer = this.buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([
				-1.0, -1.0, 
				1.0, -1.0,
				-1.0,  1.0,
				-1.0,  1.0,
				1.0, -1.0,
				1.0,  1.0
			]),
			gl.STATIC_DRAW
		);
	},

	/**
	 * Initialize textures.
	 * One 'dynamic' texture that contains the screen pixel data, and one fixed texture containing
	 * the system palette.
	 */
	initTextures: function() {

		// initialize pixel texture
		const gl = this.context;
		var texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		gl.uniform1i(gl.getUniformLocation(this.program, "pixelTexture"), 0);

		this.pixelTexture = texture;

		// initialize palette texture
		texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		gl.uniform1i(gl.getUniformLocation(this.program, "paletteTexture"), 1);

		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, 64, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, palette.data );

		this.paletteTexture = texture;
	},

	/**
	 * Initialize WebGL shaders.
	 */
	initShaders: function() {
		const gl = this.context;

		var fragmentShaderSource = [
			"precision mediump float;",
			"uniform sampler2D pixelTexture;",
			"uniform sampler2D paletteTexture;",
			"varying vec2 texCoord;",

			"void main(void) {",
				"float colorIndex = texture2D(pixelTexture, texCoord).r;",
				"vec4 color = texture2D(paletteTexture, vec2(colorIndex * (4.0 + 2.0 / 64.0), 0.5));",
				"gl_FragColor = color;",
			"}"
		].join("\n");


		var fragmentShader = gl.createShader( gl.FRAGMENT_SHADER );
		gl.shaderSource( fragmentShader, fragmentShaderSource );
		gl.compileShader( fragmentShader );

		if ( !gl.getShaderParameter( fragmentShader, gl.COMPILE_STATUS ) ) {  
			console.error( "An error occurred compiling the shaders: " + gl.getShaderInfoLog( fragmentShader ) );
		}

		var vertexShaderSource = [
			"attribute vec2 vertCoord;",
			"varying vec2 texCoord;",

			"void main() {",
				"gl_Position = vec4(vertCoord, 0, 1);",
				"texCoord = vec2( 0.5 * ( vertCoord.x + 1.0 ), 0.5 * (1.0 - vertCoord.y));",
			"}"
		].join("");

		var vertexShader = gl.createShader( gl.VERTEX_SHADER );
		gl.shaderSource( vertexShader, vertexShaderSource );
		gl.compileShader( vertexShader );

		if ( !gl.getShaderParameter( fragmentShader, gl.COMPILE_STATUS ) ) {  
			console.error( "An error occurred compiling the shaders: " + gl.getShaderInfoLog( fragmentShader ) );
		}

		var program = this.program = gl.createProgram();
		gl.attachShader( program, vertexShader );
		gl.attachShader( program, fragmentShader );
		gl.linkProgram( program );	
		gl.useProgram( program );
	},

	/**
	 * 'run' method for WebGL mode.
	 */
	runGL: function() {
		const gl = this.context,
		      program = this.program,
		      buffer = this.pixelBuffer,
		      pixelTexture = this.pixelTexture,
		      paletteTexture = this.paletteTexture;

		var el = this.el,
		    context = this.context;

		requestAnimationFrame(function flush() {
			requestAnimationFrame( flush );

			gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
			gl.clear( gl.COLOR_BUFFER_BIT );

			gl.activeTexture( gl.TEXTURE0 );
			gl.bindTexture( gl.TEXTURE_2D, pixelTexture );

			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.LUMINANCE,
				256,
				224,
				0,
				gl.LUMINANCE,
				gl.UNSIGNED_BYTE,
				buffer
			);

			gl.activeTexture( gl.TEXTURE1 );
			gl.bindTexture( gl.TEXTURE_2D, paletteTexture );

			var positionLocation = gl.getAttribLocation( program, "vertCoord" );
			gl.enableVertexAttribArray( positionLocation );
			gl.vertexAttribPointer( positionLocation, 2, gl.FLOAT, false, 0, 0 );

			gl.drawArrays( gl.TRIANGLES, 0, 6 );
		});		
	},

	/**
	 * Start 'live stream' of video output to canvas.
	 */
	run2D: function() {
		var el = this.el,
		    context = el.getContext("2d"),
		    image = context.getImageData( 0, 0, 256, 224 ),
		    imageData = image.data,
		    myData = this.data;

		requestAnimationFrame(function flush() {
			requestAnimationFrame( flush );

			imageData.set( myData );
			context.putImageData( image, 0, 0 );
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

	outputPixelGL: function( color ) {
		this.pixelBuffer[ this.index++ ] = color;
	},

	/**
	 * Output a single pixel.
	 * Actual color being displayed depends on palette being used.
	 * @see initPalette
	 */
	outputPixel2D: function( color ) {
		this.data[ this.index++ ] = this.reds[ color ];
		this.data[ this.index++ ] = this.greens[ color ];
		this.data[ this.index++ ] = this.blues[ color ];
		this.index++ ;
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