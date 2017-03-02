export default {
  init() {
    this.prgBank = 0;
    this.loadPRGBank(0x8000, this.prgBank, 0x4000);
    this.loadPRGBank(0xc000, this.prgBanks - 1, 0x4000);
  },

  writeRegister(address, value) {
    this.prgBank = value & 0xf; // TODO, difference between UNROM and UOROM?
    this.loadPRGBank(0x8000, this.prgBank, 0x4000);
  },
};
