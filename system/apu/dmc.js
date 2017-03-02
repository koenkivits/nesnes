import Channel from './channel';

class DMC extends Channel {
  constructor(apu) {
    super();

    this.apu = apu;

    this.timerMax = periodLookup[0];
    this.timer = this.period;

    this.silence = false;
    this.output = 0;

    this.sampleAddress = 0;
    this.sampleCurrentAddress = 0;
    this.sampleLength = 0;
    this.sampleBytesLeft = 0;
    this.sampleBuffer = 0;
    this.loop = false;
    this.interrupt = false;

    this.bitsLeft = 8;
    this.shifter = 0;

    this.irqEnabled = false;

    Object.preventExtensions(this);
  }

  writeRegister(index, value) {
    switch (index) {
      case 0:
        this.irqEnabled = !!(value & 0x80);
        if (!this.irqEnabled) {
          this.interrupt = false;
        }

        this.loop = !!(value & 0x40);
        this.timerMax = this.timer = periodLookup[value & 0xf] >>> 1;

        break;
      case 1:
        this.output = value & 0x7f;
        break;
      case 2:
        this.sampleAddress = this.sampleCurrentAddress = (0xc000 | (value << 6));
        break;
      case 3:
        this.sampleLength = this.sampleBytesLeft = value && ((value << 4) | 1);
        break;
    }
  }

  doTimer() {
    if (this.timerMax) {
      this.timer--;

      if (this.timer <= 0) {
        // output bit of shift register
        if (!this.silence) {
          // TODO: should not do inc/dec if limit would be exceeded
          if (this.shifter & 1) {
            this.output = Math.min(this.output + 2, 127);
          } else {
            this.output = Math.max(this.output - 2, 0);
          }

          this.sample = this.output;
        } else {
          this.sample = 0;
        }

        // clock shift register
        this.shifter >>>= 1;

        // decrement bits left counter, possibly ending output cycle
        this.bitsLeft--;

        if (!this.bitsLeft) {
          this.bitsLeft = 8;

          this.silence = !this.sampleBytesLeft;
          if (!this.silence) {
            this.readSample();
          }
        }

        this.timer += this.timerMax;
      }
    }

    if (this.irqEnabled && this.interrupt) {
      this.apu.system.cpu.requestIRQ();
    }
  }

  readSample() {
    this.shifter = this.sampleBuffer;

    // TODO stall CPU
    this.sampleBuffer = this.apu.system.memory.read(this.sampleCurrentAddress);

    this.sampleCurrentAddress++;
    if (this.sampleCurrentAddress === 0xffff) {
      this.sampleCurrentAddress = 0x8000;
    }

    this.sampleBytesLeft--;
    if (!this.sampleBytesLeft) {
      this.sampleCurrentAddress = this.sampleAddress;

      if (this.loop) {
        this.sampleBytesLeft = this.sampleLength;
      } else {
        this.interrupt = this.irqEnabled;
      }
    }
  }
}

// TODO PAL
const periodLookup = [
  428, 380, 340, 320, 286, 254, 226, 214, 190, 160, 142, 128, 106, 84, 72, 54,
];

export default DMC;
