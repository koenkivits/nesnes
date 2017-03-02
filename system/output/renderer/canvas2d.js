import { data as palette } from './palette';

class Canvas2DRenderer {
  static isSupported(el) {
    return !!getContext(el);
  }

  constructor(el) {
    this.el = el;

    this.initData();
    this.initPalette();
  }

  renderFrame(output) {
    const bgBuffer = output.bgBuffer;
    const spriteBuffer = output.spriteBuffer;
    const prioBuffer = output.prioBuffer;
    const bgColor = output.bgColor;
    const reds = this.reds;
    const greens = this.greens;
    const blues = this.blues;
    const end = bgBuffer.length;
    const data = this.data;

    let outputIndex = 0;
    let color = 0;

    for (let pixelIndex = 0; pixelIndex < end; pixelIndex++) {
      color = bgBuffer[pixelIndex];
      if (spriteBuffer[pixelIndex] && !(prioBuffer[pixelIndex] && color)) {
        color = spriteBuffer[pixelIndex];
      }
      color = (color || bgColor);

      data[outputIndex++] = reds[color];
      data[outputIndex++] = greens[color];
      data[outputIndex++] = blues[color];
      outputIndex++; // skip alpha channel
    }

    this.image.data.set(data);
    this.context.putImageData(this.image, 0, 0);
  }

  /**
   * Initialize the video output.
   */
  initData() {
    this.width = 256;
    this.height = 224;
    this.data = new Uint8Array(this.width * this.height * 4);

    for (let i = 0; i < this.data.length; i++) {
      this.data[i] = 0xff;
    }

    this.context = getContext(this.el);
    this.image = this.context.getImageData(0, 0, this.width, this.height);

    this.index = 0;
  }

  /**
   * Initialize palette for video output.
   */
  initPalette() {
    let address = 0;
    const view = palette;
    const buffer = new ArrayBuffer(0xc0);
    const splitPalette = new Uint8Array(buffer);

    // first, re-arrange RGB values in a single array (first reds, then blues, then greens)
    for (let color = 0; color < 3; color += 1) {
      for (let i = 0; i < 192; i += 3) {
        splitPalette[address] = view[i + color];
        address += 1;
      }
    }

    // then, make color values separately available in separate arrays:
    this.palette = view;
    this.reds = new Uint8Array(buffer, 0, 0x40);
    this.greens = new Uint8Array(buffer, 0x40, 0x40);
    this.blues = new Uint8Array(buffer, 0x80, 0x40);
  }
}

function getContext(el) {
  return el.getContext('2d');
}

export default Canvas2DRenderer;
