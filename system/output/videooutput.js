var palette = require("./palette");
const glMode = true;

function VideoOutput() {
	this.bgColor = 0;
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
		const width = 256,
		      height = 225,
		      length = width * height;
		      
		this.pixelBuffer = new Uint8Array( length );
		this.bgBuffer = new Uint8Array( length );
		this.spriteBuffer = new Uint8Array( length );
		this.prioBuffer = new Uint8Array( length );
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
		gl.viewport( 0, 0, 256, 224 );

		this.initShaders();
		this.initProgram();
		this.initBuffers();
		this.initTextures();

		this.bgColorLocation = gl.getUniformLocation(this.program, "bgColor");
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
		const gl = this.context,
		      program = this.program;


		// initialize pixel textures
		this.bgTexture = createTexture( 0, "bgTexture" );
		this.spriteTexture = createTexture( 1, "spriteTexture" );
		this.prioTexture = createTexture( 2, "prioTexture" );

		// initialize palette texture
		this.paletteTexture = createTexture( 3, "paletteTexture" );
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, 64, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, palette.data );

		function createTexture( index, name ) {
			var texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			gl.uniform1i(gl.getUniformLocation(program, name), index);

			return texture;
		}
	},

	/**
	 * Initialize WebGL shaders.
	 */
	initShaders: function() {
		const gl = this.context;

		var fragmentShaderSource = [
			"precision mediump float;",
			"uniform sampler2D bgTexture;",
			"uniform sampler2D spriteTexture;",
			"uniform sampler2D prioTexture;",
			"uniform sampler2D paletteTexture;",
			"uniform vec4 bgColor;",
			"varying vec2 texCoord;",

			"void main(void) {",
				"float bgIndex = texture2D(bgTexture, texCoord).r;",
				"float spriteIndex = texture2D(spriteTexture, texCoord).r;",
				"float prioIndex = texture2D(prioTexture, texCoord).r;",
				"float colorIndex = ((spriteIndex > 0.0 && (prioIndex == 0.0 || bgIndex == 0.0)) ? spriteIndex : bgIndex);",
				"vec4 color = texture2D(paletteTexture, vec2(colorIndex * (4.0 + 2.0 / 64.0), 0.5));",
				"if ( colorIndex > 0.0 ) {",
					"gl_FragColor = color;",
				"} else {",
					"gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);",
					"gl_FragColor = bgColor;",
				"}",
			"}"
		].join("\n");

		var vertexShaderSource = [
			"attribute vec2 vertCoord;",
			"varying vec2 texCoord;",

			"void main() {",
				"gl_Position = vec4(vertCoord, 0, 1);",
				"texCoord = vec2( 0.5 * ( vertCoord.x + 1.0 ), 0.5 * (1.0 - vertCoord.y));",
			"}"
		].join("");

		this.fragmentShader = compileShader( gl.FRAGMENT_SHADER, fragmentShaderSource );
		this.vertexShader = compileShader( gl.VERTEX_SHADER, vertexShaderSource );

		function compileShader( shaderType, shaderSource ) {
			var shader = gl.createShader( shaderType );
			gl.shaderSource( shader, shaderSource );
			gl.compileShader( shader );

			if ( !gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ) {  
				throw ( "An error occurred compiling the shaders: " + gl.getShaderInfoLog( shader ) );
			}

			return shader;
		}
	},

	/**
	 * Initialize WebGL program.
	 */
	initProgram: function() {
		const gl = this.context;

		var program = gl.createProgram();
		gl.attachShader( program, this.vertexShader );
		gl.attachShader( program, this.fragmentShader );
		gl.linkProgram( program );	
		gl.useProgram( program );

		this.program = program;
	},

	/**
	 * 'run' method for WebGL mode.
	 */
	runGL: function() {
		const self = this,
		      gl = this.context,
		      program = this.program,
		      //buffer = this.pixelBuffer,
		      bgBuffer = this.bgBuffer,
		      spriteBuffer = this.spriteBuffer,
		      prioBuffer = this.prioBuffer,
		      
		      bgTexture = this.bgTexture,
		      spriteTexture = this.spriteTexture,
		      prioTexture = this.prioTexture,

		      paletteTexture = this.paletteTexture,
		      pal = palette.data;

		var el = this.el,
		    context = this.context;

		requestAnimationFrame(function flush() {
			requestAnimationFrame( flush );

			gl.clearColor( 0, 0, 0, 1 );
			gl.clear( gl.COLOR_BUFFER_BIT );

			// upload background pixels
			gl.activeTexture( gl.TEXTURE0 );
			gl.bindTexture( gl.TEXTURE_2D, bgTexture );
			gl.texImage2D( gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 224, 0,	gl.LUMINANCE, gl.UNSIGNED_BYTE,	bgBuffer );

			// upload sprite pixels
			gl.activeTexture( gl.TEXTURE1 );
			gl.bindTexture( gl.TEXTURE_2D, spriteTexture );
			gl.texImage2D( gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 224, 0,	gl.LUMINANCE, gl.UNSIGNED_BYTE,	spriteBuffer );

			// upload sprite priority pixels
			gl.activeTexture( gl.TEXTURE2 );
			gl.bindTexture( gl.TEXTURE_2D, prioTexture );
			gl.texImage2D( gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 224, 0,	gl.LUMINANCE, gl.UNSIGNED_BYTE,	prioBuffer );

			// activate palette texturre
			gl.activeTexture( gl.TEXTURE3 );
			gl.bindTexture( gl.TEXTURE_2D, paletteTexture );

			var positionLocation = gl.getAttribLocation( program, "vertCoord" );
			gl.enableVertexAttribArray( positionLocation );
			gl.vertexAttribPointer( positionLocation, 2, gl.FLOAT, false, 0, 0 );

			// set default background color
			var color = self.bgColor * 3;
			gl.uniform4f( self.bgColorLocation, pal[ color ] / 256, pal[ color + 1 ] / 256 , pal[ color + 2 ] / 256, 1.0  );

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

	outputScanline: function( scanline, background, sprites, priorities ) {
		this.bgBuffer.set( background.subarray(0, 256), this.index ); // TODO: shorten buffers
		this.spriteBuffer.set( sprites.subarray(0, 256), this.index );
		this.prioBuffer.set( priorities.subarray(0, 256), this.index );
		this.index += 256;
	},

	outputPixelGL: function( color ) {
		this.bgBuffer[ this.index++ ] = color;
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