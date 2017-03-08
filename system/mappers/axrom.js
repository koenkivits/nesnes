export default {
  init() {
    this.axRomBanks = this.prgBanks >> 1;
    this.setPrgBank(0);
  },

  setPrgBank(bank) {
    this.prgBank = bank;
    this.loadPRGBank(0x8000, bank, 0x8000);
  },

  writeRegister(address, value) {
    this.setPrgBank(value & 7);

    this.mirroring = (value & 0x10) ? 4 : 3;
  },
};
