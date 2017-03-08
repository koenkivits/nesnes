import { data as palette } from './palette';

class WebGLRenderer {
  static isSupported(el) {
    return !!getGL(el);
  }

  constructor(el) {
    this.el = el;

    this.initGL();
  }

  renderFrame({ bgBuffer, spriteBuffer, prioBuffer, bgColor }) {
    const gl = this.gl;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // upload background pixels
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.bgTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 224, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, bgBuffer);

    // upload sprite pixels
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.spriteTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 224, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, spriteBuffer);

    // upload sprite priority pixels
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.prioTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 224, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, prioBuffer);

    // activate palette texturre
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTexture);

    const positionLocation = gl.getAttribLocation(this.program, 'vertCoord');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // set default background color
    const color = bgColor * 3;
    gl.uniform4f(this.bgColorLocation, palette[color] / 256, palette[color + 1] / 256, palette[color + 2] / 256, 1.0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  initGL() {
    const gl = this.gl = getGL(this.el);

    // set up viewport
    gl.viewport(0, 0, 256, 224);

    // initialize everything we need to enable rendering
    this.initShaders();
    this.initProgram();
    this.initBuffers();
    this.initTextures();

    // initialize background color variable
    this.bgColorLocation = gl.getUniformLocation(this.program, 'bgColor');
  }

  /**
   * Initialize the quad to draw to.
   */
  initBuffers() {
    const gl = this.gl;

    const buffer = this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
        1.0, -1.0,
        -1.0, 1.0,
        -1.0, 1.0,
        1.0, -1.0,
        1.0, 1.0,
      ]),
      gl.STATIC_DRAW
    );
  }

  /**
   * Initialize textures.
   * One 'dynamic' texture that contains the screen pixel data, and one fixed texture containing
   * the system palette.
   */
  initTextures() {
    const gl = this.gl;
    const program = this.program;

    const createTexture = (index, name) => {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.uniform1i(gl.getUniformLocation(program, name), index);

      return texture;
    };

    // initialize pixel textures
    this.bgTexture = createTexture(0, 'bgTexture');
    this.spriteTexture = createTexture(1, 'spriteTexture');
    this.prioTexture = createTexture(2, 'prioTexture');

    // initialize palette texture
    this.paletteTexture = createTexture(3, 'paletteTexture');
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 64, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, palette);
  }

  /**
   * Initialize WebGL shaders.
   */
  initShaders() {
    const gl = this.gl;

    const fragmentShaderSource = `
      precision mediump float;
      uniform sampler2D bgTexture;
      uniform sampler2D spriteTexture;
      uniform sampler2D prioTexture;
      uniform sampler2D paletteTexture;
      uniform vec4 bgColor;
      varying vec2 texCoord;

      void main(void) {
        float bgIndex = texture2D(bgTexture, texCoord).r;
        float spriteIndex = texture2D(spriteTexture, texCoord).r;
        float prioIndex = texture2D(prioTexture, texCoord).r;
        float colorIndex = ((spriteIndex > 0.0 && (prioIndex == 0.0 || bgIndex == 0.0)) ? spriteIndex : bgIndex);
        vec4 color = texture2D(paletteTexture, vec2( colorIndex * 4.0 + 0.0078, 0.5)); // 0.0078 == ( 0.5 * 3 / 192 ) === ( 0.5 * [RGB colors] / [palette width] )
        if ( colorIndex > 0.0 ) {
          gl_FragColor = color;
        } else {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
          gl_FragColor = bgColor;
        }
      }
    `;

    const vertexShaderSource = `
      attribute vec2 vertCoord;
      varying vec2 texCoord;

      void main() {
        gl_Position = vec4(vertCoord, 0, 1);
        texCoord = vec2( 0.5 * ( vertCoord.x + 1.0 ), 0.5 * (1.0 - vertCoord.y));
      }
    `;

    const compileShader = (shaderType, shaderSource) => {
      const shader = gl.createShader(shaderType);
      gl.shaderSource(shader, shaderSource);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw (`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`);
      }

      return shader;
    };

    this.fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    this.vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
  }

  /**
   * Initialize WebGL program.
   */
  initProgram() {
    const gl = this.gl;

    const program = gl.createProgram();
    gl.attachShader(program, this.vertexShader);
    gl.attachShader(program, this.fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    this.program = program;
  }
}

function getGL(el) {
  return (el.getContext('webgl') || el.getContext('experimental-webgl'));
}

export default WebGLRenderer;
