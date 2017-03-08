class Memory {
  constructor(system) {
    this.system = system;

    this.ram = new Uint8Array(0x0800);

    // initialize RAM to 0xff
    for (let i = 0; i < 0x0800; i++) {
      this.ram[i] = 0xff;
    }

    this.address = 0;

    this.cartridge = null;

    Object.preventExtensions(this);
  }

  loadCartridge(cartridge) {
    this.cartridge = cartridge;
  }

  readWrite(address, write, value) {
    this.address = address; // TODO, do I use this anywhere?

    switch (address) {
      case 0x4014:
        // OAM DMA, write-only
        if (write) {
          const base = value << 8;

          for (let i = 0; i < 0x100; i++) {
            this.write(0x2004, this.read(base + i));
          }

          this.system.cpu.burn(513);
        }
        return 0;
      case 0x4016:
        // read controller 1, or write controller strobe
        if (write) {
          this.system.controllers.write(value);
          return 0;
        } else {
          return this.system.controllers.read(0);
        }
      case 0x4017:
        // read controller 2
        if (write) {
          // do nothing, APU frame counter
        } else {
          return this.system.controllers.read(1);
        }
    }

    if (address >= 0x4020) {
      // address is in cartridge space
      if (write) {
        return this.system.cartridge.writePRG(address, value);
      } else {
        return this.system.cartridge.readPRG(address);
      }
    } else if (address < 0x2000) {
      address &= 0x07ff;

      // RAM
      if (write) {
        this.ram[address] = value;
        return 0;
      } else {
        return this.ram[address];
      }
    } else if (address < 0x4000) {
      // PPU registers
      address &= 7;
      if (write) {
        return this.system.ppu.writeRegister(address, value);
      } else {
        return this.system.ppu.readRegister(address);
      }
    } else { // 0x4000 <= address < 0x4020
      // APU registers
      address &= 0xff;
      if (write) {
        return this.system.apu.writeRegister(address, value);
      } else {
        return this.system.apu.readRegister(address);
      }
    }
  }

  read(address) {
    return this.readWrite(address, false, 0);
  }

  write(address, value) {
    return this.readWrite(address, true, value);
  }
}

export default Memory;
