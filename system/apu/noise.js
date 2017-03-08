import Channel from './channel';

class Noise extends Channel {
  constructor() {
    super();

    this.shift = 1;
    this.mode = 0;

    this.timerMax = periodLookup[0];
    this.timer = this.period;

    this.index = 3;

    Object.preventExtensions(this);
  }

  doTimer() {
    let feedback = 0;
    let otherBit = 0;

    if (this.timerMax) {
      if (this.timer) {
        this.timer--;
      } else {
        if (this.mode) {
          otherBit = (this.shift & 0x40) >> 6;
        } else {
          otherBit = (this.shift & 0x2) >> 1;
        }

        feedback = (this.shift ^ otherBit) & 1;

        this.shift >>>= 1;
        this.shift |= (feedback << 14);

        if (this.lengthCounter && !(this.shift & 1)) {
          this.sample = this.masterVolume;
        } else {
          this.sample = 0;
        }

        this.timer += this.timerMax;
      }
    }
  }

  writeRegister(index, value) {
    switch (index) {
      case 0:
        // set envelope
        this.setEnvelope(value);

        break;
      case 1:
        // unused
        break;
      case 2:
        // set mode and timer period
        this.mode = (value & 0x80) >>> 7;
        this.timerMax = this.timer = periodLookup[value & 15];

        break;
      case 3:
        // set length counter load and restart envelope
        this.setLengthCounter(value >>> 3);
        this.envelopeStart = true;

        break;
    }
  }
}

const periodLookup = [
  4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068,
]; // TODO support PAL

export default Noise;
