import mappers from './mappers/index';

const HORIZONTAL = 0;
const VERTICAL = 1;
const FOUR_SCREEN = 2;
const SINGLE_SCREEN_LOWER = 3;
const SINGLE_SCREEN_UPPER = 4;

class Cartridge {
  constructor(data, system) {
    this.system = system;

    this.raw = data;
    this.data = new Uint8Array(data, 0x10, data.byteLength - 0x10);
    this.header = new Uint8Array(data, 0, 0x10);

    this.validate();

    this.initHeader();
    this.initData();

    Object.preventExtensions(this);
  }

  /**
   * Validate INES header.
   * Throws an exception if invalid.
   */
  validate() {
    if (!(this.header[0] === 0x4e && // 'N'
      this.header[1] === 0x45 && // 'E'
      this.header[2] === 0x53 && // 'S'
      this.header[3] === 0x1a) // ending character
    ) {
      throw new Error('Invalid ROM!');
    }

    if (this.header[7] & 0xe) {
      throw new Error('Bit 1-3 of byte 7 in ROM header must all be zeroes!');
    }

    if (this.header[9] & 0xfe) {
      throw new Error('Bit 1-7 of byte 9 in header must all be zeroes!');
    }

    for (let i = 10; i <= 15; i++) {
      if (this.header[i]) {
        throw new Error(`Byte ${i} in ROM header must be zero.`);
      }
    }

    if (this.header[6] & 0x4) {
      // TODO support trainers
      throw new Error('Trained ROMs are not supported');
    }
  }

  /**
   * Init header flags.
   */
  initHeader() {
    const flags6 = this.header[6];
    this.mirroring = (flags6 & 0x1) ? VERTICAL : HORIZONTAL;
    this.battery = (flags6 & 0x2);
    this.trainer = (flags6 & 0x4);
    this.mirroring = (flags6 & 0x8) ? FOUR_SCREEN : this.mirroring;

    const flags7 = this.header[7];
    this.vs = (flags7 & 0x1);

    this.mapper = (
      ((flags6 & 0xf0) >> 4) |
      (flags7 & 0xf0)
    );

    this.pal = (this.header[9] & 0x1);
  }

  /**
   * Init prg/chr/ram data.
   */
  initData() {
    this.prgBanks = this.header[4];
    this.chrBanks = this.header[5];
    this.ramBanks = this.header[8] || 1;

    this.prgSize = this.prgBanks * 16 * 1024;
    this.chrSize = this.chrBanks * 8 * 1024;
    this.ramSize = this.ramBanks * 8 * 1024;

    this.prgData = this.data.subarray(0, this.prgSize);

    if (this.chrBanks) {
      this.chrData = this.data.subarray(this.prgSize, this.prgSize + this.chrSize);
    } else {
      // no CHR banks, but probably still CHR RAM
      this.chrData = new Uint8Array(0x2000);
    }

    this.ramData = new Uint8Array(this.ramSize);

    this.initMapper();
  }

  /**
   * Init mapper data and logic.
   * NESNES copies data around to a dedicated typed array to emulate mapper
   * behavior. See also loadChrBank and loadPrgBank.
   */
  initMapper() {
    this.prgRead = new Uint8Array(0x8000);
    this.prgRead.set(this.prgData.subarray(0, 0x2000));

    this.chrRead = new Uint8Array(0x2000);
    this.chrRead.set(this.chrData.subarray(0, 0x2000));

    mappers.init(this);
  }

  /**
   * Write to mapper register.
   * Should be overridden by mapper classes.
   */
  writeRegister(/* address, value */) {
  }

  /**
   * Read program data.
   * Note: also implements the most common mapper behavior.
   */
  readPRG(address) {
    if (address & 0x8000) {
      return this.prgRead[address & 0x7fff];
    } else if (address >= 0x6000) {
      return this.ramData[address - 0x6000];
    }

    return 0;
  }

  /**
   * Write program data.
   * This is usually used to write to cartridge RAM or mapper registers. Cartridges
   * don't have mappers by default, but mapperless cartridges can also not be written
   * to. This method implements the most common mapper register locations.
   */
  writePRG(address, value) {
    if (address & 0x8000) {
      this.writeRegister(address, value);
    } else if (address >= 0x6000) {
      // writing RAM
      this.ramData[address - 0x6000] = value;
    }
  }

  /**
   * Load a PRG Bank at a specific addres.
   * @param {number} address - The absolute address to load bank at (eg. 0x8000).
   * @param {number} bank - Index of bank to load at given address.
   * @param {number} size - Size of all banks.
   */
  loadPRGBank(address, bank, size) {
    const offset = bank * size;
    const bankData = this.prgData.subarray(offset, offset + size);

    this.prgRead.set(bankData, address - 0x8000);
  }

  /**
   * Read graphics data.
   */
  readCHR(address) {
    return this.chrRead[address];
  }

  /**
   * Write graphics data.
   * Usually only for cartridges with CHR RAM.
   */
  writeCHR(address, value) {
    if (!this.chrBanks) {
      // TODO, probably not doing this right for all ROMs (eg, ROMs that have both CHR ROM *and* CHR RAM)
      this.chrRead[address] = value;
    }

    return value;
  }

  readTile(baseTable, tileIndex, y) {
    const tileAddress = (tileIndex << 4) + baseTable + y;

    return (
      (this.readCHR(tileAddress) << 8) |
      this.readCHR(tileAddress + 8)
    );
  }

  /**
   * Load a CHR Bank at a specific addres.
   * @param {number} address - The absolute address to load bank at (eg. 0x8000).
   * @param {number} bank - Index of bank to load at given address.
   * @param {number} size - Size of all banks.
   */
  loadCHRBank(address, bank, size) {
    const offset = bank * size;
    const bankData = this.chrData.subarray(offset, offset + size);

    this.chrRead.set(bankData, address);
  }

  /**
   * Map a nametable address to our internal memory, taking mirroring into account.
   */
  getNameTableAddress(address) {
    switch (this.mirroring) {
      case HORIZONTAL:
        if (address >= 0x400) {
          address -= 0x400;
        }
        if (address >= 0x800) {
          address -= 0x400;
        }
        break;
      case VERTICAL:
        address &= 0x07ff;
        break;
      case FOUR_SCREEN:
        // we still don't implement any mappers that support four screen mirrroring
        throw new Error('TODO, four screen mirroring');
      case SINGLE_SCREEN_LOWER:
      case SINGLE_SCREEN_UPPER:
        address &= 0x3ff;

        if (this.mirroring === 4) {
          address += 0x400;
        }
        break;
    }

    return address;
  }

  /**
   * Read from nametables.
   */
  readNameTable(address) {
    return this.system.ppu.ram[this.getNameTableAddress(address)];
  }

  /**
   * Write to nametables.
   */
  writeNameTable(address, value) {
    this.system.ppu.ram[this.getNameTableAddress(address)] = value;
  }
}

export default Cartridge;
