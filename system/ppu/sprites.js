import bitmap from '../utils/bitmap';

const tileCycles = initTileCycles();

class Sprites {
  constructor(ppu) {
    this.ppu = ppu;
    this.memory = ppu.memory;

    this.enabled = true;
    this.enabledLeft = true;
    this.pixelOffset = 0;

    // OAM
    this.oamAddress = 0;
    this.oam = new Uint8Array(0x100);
    this.oam2 = new Uint8Array(0x21);
    this.oam2reset = new Uint8Array(this.oam2.length);
    for (let i = 0; i < this.oam2reset.length; i++) {
      this.oam2reset[i] = 0xff;
    }

    this.spriteProgress = 0;
    this.currentSprite = 0;

    this.spriteSize = 8;
    this.baseTable = 0;

    this.sprite0Next = false;
    this.sprite0InRange = false;
    this.spriteOverflow = false;
    this.scanlineOverflow = false;
    this.spriteCount = 0;
    this.nextSpriteCount = 0;

    this.yCounters = new Uint8Array(0x40);
    this.yCountersReset = new Uint8Array(this.yCounters.length);

    this.nextScanlineSprite0 = new Uint8Array(0x100);
    this.nextScanlinePriority = new Uint8Array(0x100);
    this.nextScanlineColors = new Uint8Array(0x100);

    this.scanlineSprite0 = new Uint8Array(0x100);
    this.scanlinePriority = new Uint8Array(0x100);
    this.scanlineColors = new Uint8Array(0x100);

    this.scanlineReset = new Uint8Array(this.scanlineColors.length);

    Object.preventExtensions(this);
  }

  toggle(flag) {
    this.enabled = !!flag;
  }

  toggleLeft(flag) {
    this.enabledLeft = !!flag;
  }

  evaluate() {
    if (tileCycles[this.ppu.lineCycle]) {
      this.fetchTile();
    }
  }

  initScanline() {
    this.currentSprite = 0;
    this.sprite0InRange = this.sprite0Next;
    this.sprite0Next = false;
    this.scanlineOverflow = false;

    this.oamAddress = 0;

    this.clearSecondaryOAM();

    this.scanlineSprite0.set(this.nextScanlineSprite0);
    this.scanlinePriority.set(this.nextScanlinePriority);
    this.scanlineColors.set(this.nextScanlineColors);

    if (this.nextSpriteCount) {
      this.nextScanlineSprite0.set(this.scanlineReset);
      this.nextScanlinePriority.set(this.scanlineReset);
      this.nextScanlineColors.set(this.scanlineReset);
    }

    this.spriteCount = this.nextSpriteCount;
    this.nextSpriteCount = 0;
  }

  endScanline() {
    this.initSecondaryOAM();
  }

  readOAM() {
    if (this.ppu.vBlank) { // TODO
      return this.oam[this.oamAddress];

      // TODO increment?
    }

    return 0;
  }

  writeOAM(value) {
    if (this.ppu.vBlank) {
      this.oam[this.oamAddress] = value;
      this.oamAddress = (this.oamAddress + 1) & 0xff;
    }
  }

  /**
   * Clear secondary OAM.
   */
  clearSecondaryOAM() {
    this.oam2.set(this.oam2reset);

    if (this.ppu.scanline === -1) {
      this.yCounters.set(this.yCountersReset);
    }
  }

  /**
   * Initialize secondary OAM ('sprite evaluation').
   */
  initSecondaryOAM() {
    const ppu = this.ppu;

    if (!ppu.enabled) {
      return;
    }

    let oam2Index = 0;
    let index = this.oamAddress;

    for (let n = 0; n < 64; n++) {
      let value = this.oam[index];

      this.oam2[oam2Index] = value;

      if (ppu.scanline === value) {
        this.yCounters[n] = this.spriteSize;
      }

      if (this.yCounters[n]) {
        // sprite is in range

        if (!this.scanlineOverflow) {
          // there's still space left in secondary OAM
          this.oam2.set(this.oam.subarray(index, index + 4), oam2Index);

          if (n === 0) {
            this.sprite0Next = true;
          }

          this.nextSpriteCount++;
          oam2Index += 4;

          if (oam2Index === 32) {
            this.scanlineOverflow = true;
          }
        } else {
          // secondary OAM is full but sprite is in range. Trigger sprite overflow
          this.spriteOverflow = true;

          // TODO buggy 'm' overflow behavior
        }

        this.yCounters[n]--;
      }

      index += 4;
    }

    this.oamAddress = index;
    this.oam2[oam2Index] = 0;
  }

  /**
   * Fetch sprite data and feed appropriate shifters, counters and latches.
   */
  fetchTile() {
    const spriteIndex = this.currentSprite << 2;
    const y = this.oam2[spriteIndex];
    let tileIndex = this.oam2[spriteIndex + 1];
    const attributes = this.oam2[spriteIndex + 2];
    const x = this.oam2[spriteIndex + 3];
    let baseTable = this.baseTable;
    const flipX = attributes & 0x40;
    let flipY = attributes & 0x80;
    let fineY = (this.ppu.scanline - y) & (this.spriteSize - 1);
    // (the '& spriteSize' is needed because fineY can overflow due
    // to uninitialized tiles in secondary OAM)

    if (this.spriteSize === 16) {
      // big sprite, select proper nametable and handle flipping
      baseTable = (tileIndex & 1) ? 0x1000 : 0;
      tileIndex &= ~1;

      if (fineY > 7) {
        fineY -= 8;
        if (!flipY) {
          tileIndex++;
        }
      } else if (flipY) {
        tileIndex++;
      }
    }

    if (flipY) {
      fineY = 8 - fineY - 1;
    }

    let tile = this.memory.cartridge.readTile(baseTable, tileIndex, fineY);

    if (flipX) {
      tile = bitmap.reverseTile(tile);
    }

    if (this.currentSprite < this.nextSpriteCount) {
      this.renderTile(x, tile, attributes);
    }

    this.currentSprite += 1;
  }

  renderTile(x, tile, attributes) {
    const colors = bitmap.getColors(tile);
    const palette = 0x10 | ((attributes & 3) << 2);
    const priority = attributes & 0x20;
    const sprite0 = (this.currentSprite === 0) && this.sprite0Next;

    for (let i = 8; i >= 0 && x >= this.pixelOffset && x < 0x100; i--) {
      if (!this.nextScanlineColors[x]) {
        let color = colors[i];

        if (color) {
          this.nextScanlineColors[x] = this.ppu.memory.palette[palette | color];
          this.nextScanlinePriority[x] = priority;
          this.nextScanlineSprite0[x] = sprite0;
        }
      }

      x++;
    }
  }
}

function initTileCycles() {
  const result = new Uint8Array(0x200);

  for (let i = 264; i <= 320; i += 8) {
    result[i] = 1;
  }

  return result;
}

export default Sprites;
