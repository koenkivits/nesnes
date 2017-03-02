export default {
  init() {
    this.lastA14 = 0;
    this.irqEnabled = false;
    this.irqCounter = 0;
    this.irqCounterReset = 0;
    this.willReloadIRQ = false;

    this.prgBank0 = 0;
    this.prgBank1 = 1;
    this.prgBase0 = 0x8000;
    this.prgBase1 = 0xa000;
    this.mmc3PRG = this.prgBanks << 1;
    this.lastPRG = this.mmc3PRG - 1;
    this.lastPRG2 = this.lastPRG - 1;

    this.mmc3CHR = this.chrBanks << 3;

    this.setBankSelect(0);

    this._readCHR = Object.getPrototypeOf(this).readCHR;
  },

  setBankSelect(value) {
    const prgMode = +!!(value & 0x40);
    const chrMode = +!!(value & 0x80);

    this.bankSelectMode = value & 7;

    if (prgMode !== this.prgMode) {
      this.setPRGMode(prgMode);
    }
    if (chrMode !== this.chrMode) {
      this.setCHRMode(chrMode);
    }
  },

  setPRGMode(mode) {
    this.prgMode = mode;

    if (mode) {
      this.loadPRGBank(0x8000, this.lastPRG2, 0x2000);
      this.prgBase0 = 0xc000;
    } else {
      this.loadPRGBank(0xc000, this.lastPRG2, 0x2000);
      this.prgBase0 = 0x8000;
    }

    this.loadPRGBank(0xe000, this.lastPRG, 0x2000);
    this.prgBase1 = 0xa000;

    this.setPRGBanks();
  },

  setBank(value) {
    let bank = 0;
    let base = 0;

    switch (this.bankSelectMode) {
      case 1:
        bank = 1;
      /* falls through */
      case 0:
        base = this.chrBigBase + bank * 0x800;
        this.loadCHRBank(base, value & ~1, 0x400);
        this.loadCHRBank(base + 0x400, value | 1, 0x400);
        break;
      case 2:
      case 3:
      case 4:
      case 5:
        bank = this.bankSelectMode - 2;
        base = this.chrSmallBase + (bank * 0x400);
        this.loadCHRBank(base, value, 0x400);
        break;
      case 6:
        this.prgBank0 = value & (this.mmc3PRG - 1);
        this.setPRGBanks();
        break;
      case 7:
        this.prgBank1 = value & (this.mmc3PRG - 1);
        this.setPRGBanks();
        break;
    }
  },

  setPRGBanks() {
    this.loadPRGBank(this.prgBase0, this.prgBank0, 0x2000);
    this.loadPRGBank(this.prgBase1, this.prgBank1, 0x2000);
  },

  setCHRMode(mode) {
    this.chrMode = mode;

    if (mode) {
      this.chrBigBase = 0x1000;
      this.chrSmallBase = 0;
    } else {
      this.chrBigBase = 0;
      this.chrSmallBase = 0x1000;
    }
  },

  setMirroring(value) {
    this.mirroring = +!(value & 1);
  },

  setRAMProtect() {
    // TODO, implement
  },

  reloadIRQ() {
    this.willReloadIRQ = true;
  },

  setIRQCounter(value) {
    this.irqCounterReset = value;
  },

  enableIRQ(enabled) {
    this.irqEnabled = enabled;

    // TODO: should acknowledge any pending interrupts if !enabled?
  },

  writeRegister(address, value) {
    const odd = (address & 1);

    switch (address & 0x6000) {
      case 0x0000:
        // $8000 - $9fff
        if (odd) {
          this.setBank(value);
        } else {
          // even
          this.setBankSelect(value);
        }
        break;
      case 0x2000:
        // $a000 - $bfff
        if (odd) {
          this.setRAMProtect(value);
        } else {
          // even
          this.setMirroring(value);
        }
        break;
      case 0x4000:
        // $c000 - $dfff
        if (odd) {
          this.reloadIRQ();
        } else {
          // even
          this.setIRQCounter(value);
        }
        break;
      case 0x6000:
        // $e000 - $ffff
        this.enableIRQ(!!odd);
        break;
    }
  },

  readCHR(address) {
    const a14 = address & 0x1000;

    if (a14 && (a14 !== this.lastA14)) {
      this.clockScanlineCounter();
    }

    this.lastA14 = a14;

    return this._readCHR(address);
  },

  clockScanlineCounter() {
    if (this.willReloadIRQ || !this.irqCounter) {
      this.irqCounter = this.irqCounterReset;
      this.willReloadIRQ = false;
    } else {
      this.irqCounter--;

      if (!this.irqCounter && this.irqEnabled) {
        this.system.cpu.requestIRQ();
      }
    }
  },
};
