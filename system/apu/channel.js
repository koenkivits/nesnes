class Channel {
  constructor() {
    this.enabled = false;

    this.lengthCounter = 0;
    this.lengthCounterHalt = false;

    this.sample = 0;

    this.volume = 0;
    this.masterVolume = 0;

    this.envelopeStart = true;
    this.envelopeLoop = false;
    this.envelopeCounter = 0;
    this.envelopeDividerPeriod = 0;
    this.envelopeDividerCount = 0;
    this.envelopeDisabled = false;
  }

  toggle(flag) {
    if (flag) {
      this.enable();
    } else {
      this.disable();
    }
  }

  disable() {
    this.enabled = false;
    this.lengthCounter = 0;
  }

  enable() {
    this.enabled = true;
  }

  doLengthCounter() {
    if (this.lengthCounter && !this.lengthCounterHalt) {
      this.lengthCounter--;
    }
  }

  setLengthCounter(value) {
    if (this.enabled) {
      this.lengthCounter = lengthCounterLookup[value];
    }
  }

  doEnvelope() {
    if (this.envelopeStart) {
      this.envelopeStart = false;
      this.envelopeCounter = 15;
      this.envelopeDividerCount = this.envelopeDividerPeriod;
    } else if (this.envelopeDividerCount) {
      this.envelopeDividerCount -= 1;

      if (this.envelopeDividerCount === 0) {
        if (this.envelopeCounter === 0 && this.envelopeLoop) {
          // looping envelope
          this.envelopeCounter = 15;
        } else if (this.envelopeCounter) {
          // decrement envelope counter while it is non-zero
          this.envelopeCounter -= 1;
        }

        this.envelopeDividerCount = this.envelopeDividerPeriod;
      }
    } else {
      this.envelopeCounter = 0;
    }

    if (this.envelopeDisabled) {
      this.masterVolume = this.volume;
    } else {
      this.masterVolume = this.envelopeCounter;
    }
  }

  setEnvelope(value) {
    this.volume = (value & 0xf); // || this.volume;

    this.lengthCounterHalt = this.envelopeLoop = !!(value & 0x20);
    this.envelopeDisabled = !!(value & 0x10);
    this.envelopeDividerPeriod = this.volume + 1;
    this.envelopeStart = true;
  }
}

const lengthCounterLookup = [
  10, 254, 20, 2, 40, 4, 80, 6, 160, 8, 60, 10, 14, 12, 26, 14,
  12, 16, 24, 18, 48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 30,
];

export default Channel;
