import Background from './background';
import Sprites from './sprites';
import Memory from './memory';

class PPU {
  constructor(system) {
    this.system = system;
    this.ram = new Uint8Array(0x0800);

    this.enabled = true;
    this.frameEnded = false;

    this.vBlank = false;
    this.warmup = 2;

    this.scanline = -1;
    this.lineCycle = 0;

    // control flags
    this.increment = 1;
    this.masterSlave = 0; // TODO, don't quite know what this is
    this.generateNMI = false; // TODO implement NMI

    // status flags
    this.sprite0Hit = false;
    this.nmiOccurred = false;
    this.checkNMI = false;

    // flags to check if a pixel should be output
    this.pixelInRange = false;
    this.yInRange = false;
    this.inRenderScanline = true;
    // this.inLeft8px = false;

    this.readBuffer = 0;
    this.countdown = 0;

    this.memory = new Memory(this);
    this.background = new Background(this);
    this.sprites = new Sprites(this);

    this.output = this.system.output.video;

    Object.preventExtensions(this);
  }

  readStatus() {
    const result = (
      (!!this.nmiOccurred << 7) |
      (!!this.sprite0Hit << 6) |
      (!!this.sprites.spriteOverflow << 5)
    );

    this.nmiOccurred = false;

    return result;
  }

  /**
   * Set various flags to control video output behavior.
   */
  mask(value) {
    this.output.setGrayscale(value & 0x1);
    this.output.setIntensity(value & 0x20, value & 0x40, value & 0x80);

    this.sprites.toggle(value & 0x10);
    this.sprites.toggleLeft(value & 0x4);

    this.background.toggle(value & 0x8);
    this.background.toggleLeft(value & 0x2);

    this.enabled = (this.sprites.enabled || this.background.enabled);
  }

  /**
   * Set various flags to control rendering behavior.
   */
  control(value) {
    const nametableFlag = value & 0x3;
    const incrementFlag = value & 0x4;
    const spriteFlag = value & 0x8;
    const backgroundFlag = value & 0x10;
    const sizeFlag = value & 0x20;
    const nmiFlag = value & 0x80;

    this.background.setNameTable(nametableFlag);

    this.increment = incrementFlag ? 32 : 1;
    this.sprites.baseTable = spriteFlag ? 0x1000 : 0x0000;
    this.background.baseTable = backgroundFlag ? 0x1000 : 0x0000;
    this.sprites.spriteSize = sizeFlag ? 16 : 8;
    this.generateNMI = !!nmiFlag;

    // TODO multiple NMIs can occure when writing to PPUCONTROL without reading
    // PPUSTATUS
  }

  readRegister(address) {
    let result;

    switch (address) {
      case 2:
        result = this.readStatus();
        this.background.loopyW = 0; // also reset first write flag

        return result;
      case 4:
        return this.sprites.readOAM();
      case 7:
        // read from ppu memory

        // result is buffered and not only returned on next read
        result = this.readBuffer;
        this.readBuffer = this.memory.read(this.background.loopyV);

        // palette memory is not buffered ..
        if ((this.background.loopyV & 0x3f00) === 0x3f00) {
          result = this.readBuffer;

          // but does put the mirrored nametable byte in the read buffer
          this.readBuffer = this.memory.read(this.background.loopyV & 0x2fff);
        }

        this.background.loopyV += this.increment; // TODO only outside of rendering

        return result;
    }
  }

  writeRegister(address, value) {
    switch (address) {
      case 0:
        this.control(value);
        break;
      case 1:
        this.mask(value);
        break;
      case 3:
        this.sprites.oamAddress = value;
        break;
      case 4:
        this.sprites.writeOAM(value);

        // TODO, should actually do glitchy increment, see http://wiki.nesdev.com/w/index.php/PPU_registers

        break;
      case 5:
        this.background.writeScroll(value);

        break;
      case 6:
        this.background.writeAddress(value);

        break;
      case 7:
        this.memory.write(this.background.loopyV, value);
        this.background.loopyV += this.increment; // TODO only outside of rendering
        break;
    }
  }

  /**
   * A single PPU tick.
   */
  tick() {
    const sprites = this.sprites;
    const background = this.background;

    if (this.inRenderScanline) {
      if (this.enabled) {
        background.evaluate();
        sprites.evaluate();
      }

      if (this.pixelInRange &&
        sprites.sprite0InRange &&
        sprites.scanlineSprite0[this.lineCycle - 1] && !this.sprite0Hit) {
        this.sprite0Hit = !!background.scanlineColors[this.lineCycle - 1];
      }

      this.incrementRenderCycle();
    } else {
      this.incrementIdleCycle();
    }
  }

  incrementRenderCycle() {
    switch (++this.lineCycle) {
      case 1:
        this.background.initScanline();
        this.sprites.initScanline();
        this.pixelInRange = this.yInRange;

        break;
      case 257:
        this.pixelInRange = false;

        if (this.yInRange) {
          this.output.outputScanline(
            this.background.scanlineColors,
            this.sprites.scanlineColors,
            this.sprites.scanlinePriority
          );
        }

        if (this.enabled) {
          this.background.endScanline();
          this.sprites.endScanline();
        }

        break;
      case 341:
        this.incrementScanline();
        break;
    }
  }

  incrementIdleCycle() {
    if (!(this.countdown--)) {
      this.scanline = -1;
      this.frameEnded = true;
      this.inRenderScanline = true;

      this.vBlank = this.nmiOccurred = false;
      this.checkNMI = false;
      this.sprites.spriteOverflow = false;
      this.sprite0Hit = false;
    }
  }

  incrementScanline() {
    this.scanline++;
    this.lineCycle = 0;

    switch (this.scanline) {
      case 8:
        this.output.reset(this.memory.palette[0]);
        this.yInRange = true;

        // at scanline === 8 because of overscan
        break;
      case 233:
        this.yInRange = false;

        // at scanline === 233 because of overscan
        break;
      case 240:
        this.inRenderScanline = false;

        this.vBlank = this.nmiOccurred = this.checkNMI = true;

        if (this.generateNMI) {
          this.system.cpu.requestNMI();
        }

        this.countdown = 6800;

        break;
    }
  }
}

export default PPU;
