import Pulse from './pulse';
import Triangle from './triangle';
import Noise from './noise';
import DMC from './dmc';

class APU {
  constructor(system) {
    this.system = system;
    this.output = system.output.audio;

    this.sampleCounter = 0;
    this.sampleCounterMax = (1789773 / 2 / this.output.sampleRate); // TODO, this is NTSC-only

    this.frameCounterMode = 0;
    this.frameCounterInterrupt = false;
    this.frameCount = 0;

    this.cycles = 0;

    this.pulse1 = new Pulse();
    this.pulse2 = new Pulse();
    this.triangle = new Triangle();
    this.noise = new Noise();
    this.dmc = new DMC(this);

    Object.preventExtensions(this);
  }

  /**
   * Handle system reset.
   */
  reset() {
    this.writeStatus(0x0);
  }

  /**
   * Read APU registers.
   * The APU only has a single readable register: 0x4015.
   */
  readRegister(address) {
    if (address === 0x15) {
      return this.readStatus();
    }

    return 0;
  }

  /**
   * Read channel status.
   */
  readStatus() {
    return (
      ((!!this.pulse1.lengthCounter) << 0) |
      ((!!this.pulse2.lengthCounter) << 1) |
      ((!!this.triangle.lengthCounter) << 2) |
      ((!!this.noise.lengthCounter) << 3) |
      ((!!this.dmc.sampleBytesLeft) << 4)
    );
  }

  /**
   * Write to APU registers.
   */
  writeRegister(address, value) {
    if (address < 0x4) {
      // pulse 1 registers
      this.pulse1.writeRegister(address, value);
    } else if (address < 0x8) {
      // pulse 2 registers
      this.pulse2.writeRegister(address - 0x4, value);
    } else if (address < 0xc) {
      // triangle registers
      this.triangle.writeRegister(address - 0x8, value);
    } else if (address < 0x10) {
      // noise registers
      this.noise.writeRegister(address - 0xc, value);
    } else if (address < 0x14) {
      // DMC registers
      this.dmc.writeRegister(address - 0x10, value);
    } else if (address === 0x15) {
      // enabling / disabling channels
      this.writeStatus(value);
    } else if (address === 0x17) {
      // set framecounter mode

      this.frameCounterMode = +!!(value & 0x80);
      this.frameCounterInterrupt = !(value & 0x40);

      this.cycles = 0;
      // TODO:
      // If the write occurs during an APU cycle, the effects occur 3 CPU cycles
      // after the $4017 write cycle, and if the write occurs between APU cycles,
      // the effects occurs 4 CPU cycles after the write cycle.

      if (this.frameCounterMode) {
        // Writing to $4017 with bit 7 set will immediately generate a clock for
        // both the quarter frame and the half frame units, regardless of what
        // the sequencer is doing.

        this.doQuarterFrame();
        this.doHalfFrame();
      }

    }
  }

  /**
   * Enabled and/or disabled channels.
   */
  writeStatus(value) {
    this.pulse1.toggle(value & 1);
    this.pulse2.toggle(value & 2);
    this.triangle.toggle(value & 4);
    this.noise.toggle(value & 8);
  }

  /**
   * Do a single APU tick.
   */
  tick() {
    switch (this.frameCounterMode) {
      case 0:
        this.tick0();
        break;
      default:
        this.tick1();
    }

    this.cycles += 1;

    this.updateSample();
  }

  /**
   * Tick for framecounter mode 0.
   */
  tick0() {
    switch (this.cycles) {
      case 3728:
      case 7457:
      case 11186:
      case 14915:
        this.doQuarterFrame();
        break;
    }

    switch (this.cycles) {
      case 7457:
      case 14915:
        this.doHalfFrame();
        break;
    }

    if (this.cycles >= 14915) {
      this.cycles = 0;

      if (this.frameCounterInterrupt) {
        this.system.cpu.requestIRQ();
      }
    }
  }

  /**
   * Tick for framecounter mode 1.
   */
  tick1() {
    switch (this.cycles) {
      case 3729:
      case 7457:
      case 11186:
      case 18641:
        this.doQuarterFrame();
        break;
    }

    switch (this.cycles) {
      case 7457:
      case 18641:
        this.doHalfFrame();
        break;
    }

    if (this.cycles >= 18641) {
      this.cycles = 0;
    }
  }

  /**
   * Do quarter frame tick (envelopes and linear counter).
   */
  doQuarterFrame() {
    this.pulse1.doEnvelope();
    this.pulse2.doEnvelope();
    this.noise.doEnvelope();
    this.triangle.doLinearCounter();
  }

  /**
   * Do half frame tick (sweeps and length counters).
   */
  doHalfFrame() {
    this.pulse1.doSweep();
    this.pulse1.doLengthCounter();

    this.pulse2.doSweep();
    this.pulse2.doLengthCounter();

    this.triangle.doLengthCounter();

    this.noise.doLengthCounter();
    // TODO
  }

  /**
   * Update output sample.
   */
  updateSample() {
    let tndOut = 0; // triangle, noise, dmc
    let pulseOut = 0;

    this.pulse1.doTimer();
    this.pulse2.doTimer();
    this.triangle.doTimer();
    this.noise.doTimer();
    this.dmc.doTimer();

    if (this.output.enabled) {
      // no need to do calculations if output is disabled
      if (this.sampleCounter >= this.sampleCounterMax) {
        pulseOut = pulseTable[this.pulse1.sample + this.pulse2.sample];
        tndOut = tndTable[3 * this.triangle.sample + 2 * this.noise.sample + this.dmc.sample];

        this.output.writeSample(pulseOut + tndOut);

        this.sampleCounter -= this.sampleCounterMax;
      }

      this.sampleCounter += 1;
    }
  }
}

/**
 * Calculate lookup tables for audio samples.
 */
const pulseTable = new Float32Array(31);
for (let i = 0; i < 31; i++) {
  pulseTable[i] = 95.52 / (8128.0 / i + 100);
}
const tndTable = new Float32Array(203);
for (let i = 0; i < 203; i++) {
  tndTable[i] = 163.67 / (24329.0 / i + 100);
}

export default APU;
