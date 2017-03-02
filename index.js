import CPU from './system/cpu';
import APU from './system/apu/index';
import PPU from './system/ppu/index';
import Cartridge from './system/cartridge';
import Controllers from './system/controllers/index';
import Output from './system/output/index';
import Memory from './system/memory';
import utils from './browser/utils';
import Input from './system/input/index';

import config from './config.json';

class System {
  constructor(el) {
    this.config = config;

    // system timing flags
    this.frameEnded = false;
    this.tickAPU = false;

    // IO
    this.controllers = new Controllers();
    this.input = new Input(this);
    this.output = new Output();

    // video output
    if (el) {
      this.output.video.setElement(el);
    }

    // reserve for timing
    this.interval = null;
    this.running = false;
    this.paused = true;

    // reserve for system core
    this.cartridge = null;
    this.cpu = null;
    this.apu = null;
    this.ppu = null;
    this.memory = null;

    Object.preventExtensions(this);
  }

  /**
   * Load a ROM and optionally run it.
   * @param {string} filename - Path of ROM to run.
   * @param autorun - If true, run ROM when loaded. If a function, call that function.
   */
  load(filename, autorun) {
    utils.readFile(filename, (data) => {
      this.initCartridge(data);

      if (typeof autorun === 'function') {
        autorun();
      } else if (autorun === true) {
        this.run();
      }
    });
  }

  /**
   * Turn on and run emulator.
   */
  run() {
    if (this.interval) {
      // once is enough
      return;
    }

    this.interval = setInterval(() => {
      if (!this.paused) {
        this.runFrame();
      }
    }, 1000 / 60);

    this.output.video.run();

    this.running = true;
    this.paused = false;
  }

  /**
   * Run a single frame (1/60s NTSC, 1/50s PAL).
   */
  runFrame() {
    const cpu = this.cpu;
    const ppu = this.ppu;
    const apu = this.apu;

    while (!ppu.frameEnded) {
      cpu.tick();

      ppu.tick();
      ppu.tick();
      ppu.tick();

      if (this.tickAPU) {
        apu.tick();
      }
      this.tickAPU = !this.tickAPU;
    }

    ppu.frameEnded = false;
  }

  /**
   * Synchronously simulate running for a number of milliseconds.
   * @param {number} milliseconds - The number of milliseconds to simulate.
   */
  simulate(milliseconds) {
    const frames = (milliseconds / 1000) * 60;

    for (let i = 0; i < frames; i++) {
      this.runFrame();
    }
  }

  /**
   * Resume running.
   */
  play() {
    this.paused = false;

    if (!this.running) {
      this.run();
    }
  }

  /**
   * Stop running.
   */
  pause() {
    this.paused = true;
  }

  /**
   * On/off switch.
   */
  toggle() {
    if (this.paused) {
      this.play();
    } else {
      this.pause();
    }

    return this.paused;
  }

  /**
   * Initialize cartridge and hook into system.
   */
  initCartridge(data) {
    this.cartridge = new Cartridge(data, this);

    this.initCore();
    this.reset();
  }

  loadCartridge(cartridge) {
    // this.cartridge = cartridge;
    this.memory.loadCartridge(cartridge);
    this.ppu.memory.loadCartridge(cartridge);
  }

  /**
   * Initialize the core of our emulator (processor etc).
   */
  initCore() {
    this.memory = new Memory(this);
    this.cpu = new CPU(this);
    this.apu = new APU(this);
    this.ppu = new PPU(this);

    this.loadCartridge(this.cartridge);
  }

  /**
   * Reset the console.
   */
  reset() {
    this.cpu.reset();
    this.apu.reset();
  }
}

export default System;
