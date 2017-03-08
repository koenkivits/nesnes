import bitmap from '../utils/bitmap';

// bitmasks
const NAMETABLE_BITMASK = 0xc00;
const NAMETABLE_RESET = ~NAMETABLE_BITMASK;

const attrAddresses = initAttrAddresses();
const tileCycles = initTileCycles();
const palettes = initPalettes();
const masks = initMasks();

class Background {
  constructor(ppu) {
    this.ppu = ppu;
    this.memory = ppu.memory;

    this.enabled = true;
    this.enabledLeft = true;
    this.pixelOffset = 0;

    this.loopyV = 0;
    this.loopyT = 0;
    this.loopyW = 0;
    this.loopyX = 0;

    this.baseTable = 0;

    this.x = 0;
    this.y = 0;

    this.scanlineColors = new Uint8Array(0x100);
    this.scanlineReset = new Uint8Array(0x100);

    Object.preventExtensions(this);
  }

  toggle(flag) {
    this.enabled = !!flag;
  }

  toggleLeft(flag) {
    this.enabledLeft = !!flag;
  }

  writeAddress(value) {
    if (this.loopyW) {
      value &= 0xff;
      this.loopyT = (this.loopyT & 0xff00) | value;
      this.loopyV = this.loopyT;
    } else {
      value &= 0x3f; // only use lowest 6 bits
      value <<= 8;
      this.loopyT = (this.loopyT & 0x00ff) | value; // note, also resets bit 14 of loopy_t (for unknown reason)
    }

    this.loopyW = !this.loopyW;
  }

  writeScroll(value) {
    if (this.loopyW) {
      // set vertical scroll
      this.loopyT = this.loopyT & ~0x73e0;
      this.loopyT = this.loopyT | ((value & 0x7) << 12);
      this.loopyT = this.loopyT | ((value & 0xf8) << 2);

      this.loopyW = 0;
    } else {
      // set horizontal scroll
      this.loopyT = this.loopyT & 0x7fe0;
      this.loopyT |= (value >> 3);

      this.loopyX = value & (0x7);

      this.loopyW = 1;
    }
  }

  evaluate() {
    const ppu = this.ppu;
    const lineCycle = ppu.lineCycle;

    if (tileCycles[lineCycle]) {
      this.fetchTile();
    }

    // finish initialization of loopy_v from loopy_t at end of pre-render scanline
    if (
      ppu.scanline === -1 &&
      lineCycle > 280 &&
      lineCycle < 304
    ) {
      // copy vertical bits from loopy_t to loopy_v
      this.loopyV = (this.loopyV & 0x41f) | (this.loopyT & 0x7be0);
      // this.oddY = false;
    }
  }

  initScanline() {
    this.pixelOffset = (this.enabledLeft ? 0 : 8);
  }

  endScanline() {
    // increment coarse X position every 8th cycle
    this.incrementVY();

    // reset horizontal at end of scanline
    // copy horizontal bits from loopy_t to loopy_v
    // TODO: should actually happen on *next* cycle, is this OK?
    this.loopyV = (this.loopyV & 0x7be0) | (this.loopyT & 0x41f);

    this.scanlineColors.set(this.scanlineReset);
    this.x = -this.loopyX;
  }

  /**
   * Increment coarse X scroll in loopy_v.
   */
  incrementVX() {
    if ((this.loopyV & 0x1f) === 31) {
      // coarse X is maxed out, wrap around to next nametable
      this.loopyV = (this.loopyV & (0xffff & ~0x1f)) ^ 0x0400;
    } else {
      // we can safely increment loopy_v (since X is in the lowest bits)
      this.loopyV += 1;
    }

    this.x += 8;
  }

  /**
   * Increment Y scroll in loopy_v.
   * TODO optimizations
   */
  incrementVY() {
    if ((this.loopyV & 0x7000) != 0x7000) {
      // fine Y < 7: increment
      this.loopyV += 0x1000;
    } else {
      // fine Y at maximum: reset fine Y, increment coarse Y
      this.loopyV &= ~0x7000;

      let coarseY = (this.loopyV & 0x03e0) >>> 5;
      if (coarseY == 29) {
        // switch vertical nametable
        coarseY = 0;
        this.loopyV ^= 0x0800;
      } else if (coarseY == 31) {
        // reset coarse Y without switching nametable
        coarseY = 0;
      } else {
        // simply increment coarse Y
        coarseY += 1;
      }

      // set coarse Y in loopy_v
      this.loopyV = (this.loopyV & ~0x03e0) | (coarseY << 5);
    }

    this.y = (this.loopyV & 0x7000) >> 12;
  }

  /**
   * Fetch background tile data.
   */
  fetchTile() {
    const cartridge = this.memory.cartridge;

    const attrAddress = attrAddresses[this.loopyV];
    const attribute = cartridge.readNameTable(attrAddress & 0x1fff);

    const nametableAddress = 0x2000 | (this.loopyV & 0x0fff);
    const tileIndex = cartridge.readNameTable(nametableAddress & 0x1fff);
    const tile = cartridge.readTile(this.baseTable, tileIndex, this.y);

    if (tile) {
      this.renderTile(
        tile,
        palettes[attribute & masks[this.loopyV & 0xfff]]
      );
    }

    this.incrementVX();
  }

  renderTile(tile, palette) {
    const colors = bitmap.getColors(tile);
    const begin = Math.max(this.pixelOffset, this.x);
    let color = 0;
    let end = Math.min(0xff, this.x + 7);
    let i = 7 - (end - begin);

    for (; end >= begin; end--) {
      color = colors[i++];

      if (color) {
        this.scanlineColors[end] = this.ppu.memory.palette[palette | color];
      }
    }
  }

  setNameTable(index) {
    this.loopyT = (this.loopyT & NAMETABLE_RESET) | (index << 10);
  }
}

/**
 * Initialize attribute address lookup table.
 * Maps loopy_v values to attribute addresses.
 */
function initAttrAddresses() {
  const result = new Uint16Array(0x8000);

  for (let i = 0; i < 0x8000; i++) {
    result[i] = 0x23c0 | (i & 0x0c00) | ((i >> 4) & 0x38) | ((i >> 2) & 0x07);
  }

  return result;
}

/**
 * Inititialze mask lookup table.
 * Maps loopy_v values to bitmasks for attribute bytes to get the correct palette value.
 */
function initMasks() {
  const result = new Uint8Array(0x10000);

  for (let i = 0; i < 0x10000; i++) {
    let mask = 3;
    if (i & 0x2) {
      // right
      mask <<= 2;
    }
    if (i & 0x40) {
      // bottom
      mask <<= 4;
    }

    result[i] = mask;
  }

  return result;
}

/**
 * Initialize tile palette lookup table.
 * Maps ( attribute byte & mask ) to palette value.
 */
function initPalettes() {
  const result = new Uint8Array(0x100);

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 8; j += 2) {
      result[i << j] = i << 2; // shift by 2 places, so value can be easily ORed with color
    }
  }

  return result;
}

/**
 * Initialize tile fetch cycles.
 * Returns a typed array containing a 1 at every cycle a background tile should be fetched.
 */
function initTileCycles() {
  const result = new Uint8Array(400);

  for (let i = 7; i < 256; i += 8) {
    result[i] = 1;
  }
  for (let i = 327; i < 336; i += 8) {
    result[i] = 1;
  }

  return result;
}

export default Background;
