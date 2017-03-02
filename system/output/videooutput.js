import WebGLRenderer from './renderer/webgl';
import Canvas2DRenderer from './renderer/canvas2d';

class VideoOutput {
  constructor() {
    const width = 256;
    const height = 225;
    const length = width * height;

    this.pixelBuffer = new Uint8Array(length);
    this.bgBuffer = new Uint8Array(length);
    this.spriteBuffer = new Uint8Array(length);
    this.prioBuffer = new Uint8Array(length);

    this.index = 0;
    this.bgColor = 0;

    this.force2D = false;
  }

  /**
   * 'run' method for WebGL mode.
   */
  run() {
    const flush = () => {
      requestAnimationFrame(flush);

      this.renderer.renderFrame(this);
    };

    requestAnimationFrame(flush);
  }

  /**
   * Reset output pixel position.
   */
  reset(bgColor) {
    this.index = 0;
    this.bgColor = bgColor;
  }

  /**
   * Set screen color intensity.
   * TODO: actually support this.
   */
  setIntensity() {
    // do nothing for now
  }

  /**
   * Switch grayscale mode.
   * TODO: actually support this.
   */
  setGrayscale() {
    // do nothing for now
  }

  /**
   * Output a scanline.
   * @param {Uint8Array} background - Scanline background buffer
   * @param {Uint8Array} sprites - Scanline sprite buffer
   * @param {Uint8Array} priorities - Scanline sprite priority buffer
   */
  outputScanline(background, sprites, priorities) {
    this.bgBuffer.set(background, this.index);
    this.spriteBuffer.set(sprites, this.index);
    this.prioBuffer.set(priorities, this.index);
    this.index += 256;
  }

  /**
   * Connect video output to a Canvas DOM element.
   */
  setElement(el) {
    this.el = el;

    this.initRenderer();
  }

  /**
   * Initialize renderer.
   */
  initRenderer() {
    if (!this.force2D && WebGLRenderer.isSupported(this.el)) {
      this.renderer = new WebGLRenderer(this.el);
    } else if (Canvas2DRenderer.isSupported(this.el)) {
      this.renderer = new Canvas2DRenderer(this.el);
    } else {
      throw new Error('No supported renderer!');
    }
  }
}

export default VideoOutput;
