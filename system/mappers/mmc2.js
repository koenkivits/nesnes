export default {
  init() {
    this.setPrgBank(0);

    this.mmc2PRG = this.prgBanks << 1;
    this.loadPRGBank(0xa000, this.mmc2PRG - 3, 0x2000);
    this.loadPRGBank(0xc000, this.mmc2PRG - 2, 0x2000);
    this.loadPRGBank(0xe000, this.mmc2PRG - 1, 0x2000);

    this.chrLatch0 = false;
    this.chrLatch1 = false;

    this.chrBank0 = this.chrBank1 = 0;
    this.chrBank2 = this.chrBank3 = 0;

    this.chrBankA = this.chrBank0;
    this.chrBankB = this.chrBank1;

    this.setChrBanks();

    this.initLatchSwitches();

    this._readCHR = Object.getPrototypeOf(this).readCHR;
  },

  initLatchSwitches() {
    const switches = new Uint8Array(0x2000);
    switches[0xfd8] = 1;
    switches[0xfe8] = 2;

    for (let i = 0x1fd8; i < 0x1fe0; i++) {
      switches[i] = 3;
    }
    for (let i = 0x1fe8; i < 0x1ff0; i++) {
      switches[i] = 4;
    }

    this.latchSwitches = switches;
  },

  setChrBanks() {
    const bank0 = (this.chrLatch0 ? this.chrBank1 : this.chrBank0);
    const bank1 = (this.chrLatch1 ? this.chrBank3 : this.chrBank2);

    this.loadCHRBank(0x0000, bank0, 0x1000);
    this.loadCHRBank(0x1000, bank1, 0x1000);
  },

  setPrgBank(bank) {
    this.prgBank = bank;
    this.loadPRGBank(0x8000, this.prgBank, 0x2000);
  },

  writeRegister(address, value) {
    switch (address & 0x7000) {
      case 0x2000:
        // $a000 - $afff
        this.setPrgBank(value & 0xf);
        break;
      case 0x3000:
        // $b000 - $bfff
        this.chrBank0 = value & 0x1f;
        break;
      case 0x4000:
        // $c000 - $cfff
        this.chrBank1 = value & 0x1f;
        break;
      case 0x5000:
        // $d000 - $dfff
        this.chrBank2 = value & 0x1f;
        break;
      case 0x6000:
        // $e000 - $efff
        this.chrBank3 = value & 0x1f;
        break;
      case 0x7000:
        // $f000 - $ffff
        this.mirroring = +!(value & 1);
        break;
    }

    this.setChrBanks();
  },

  readCHR(address) {
    const value = this._readCHR(address);

    switch (this.latchSwitches[address]) {
      case 0:
        break;
      case 1:
        if (this.chrLatch0) {
          this.chrLatch0 = false;
          this.setChrBanks();
        }
        break;
      case 2:
        if (!this.chrLatch0) {
          this.chrLatch0 = true;
          this.setChrBanks();
        }
        break;
      case 3:
        if (this.chrLatch1) {
          this.chrLatch1 = false;
          this.setChrBanks();
        }
        break;
      case 4:
        if (!this.chrLatch1) {
          this.chrLatch1 = true;
          this.setChrBanks();
        }
        break;
    }

    return value;
  },
};
