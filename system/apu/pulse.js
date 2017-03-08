import Channel from './channel';

class Pulse extends Channel {
  constructor() {
    super();

    this.timerMax = 0;
    this.timer = 0;

    this.duty = 0;

    this.sweepStart = true;
    this.sweepEnabled = false;
    this.sweepDividerPeriod = 0;
    this.sweepDividerCount = 0;
    this.sweepNegate = false;
    this.sweepShiftCount = 0;

    this.pulseCounter = 0;

    this.silence = false;

    Object.preventExtensions(this);
  }

  doSweep() {
    const adjustPulse = !this.sweepDividerCount;
    let timerDelta = 0;
    let targetTimer = 0;

    if (this.sweepStart) {
      this.sweepDividerCount = this.sweepDividerPeriod;
      this.sweepStart = false;
    }

    if (adjustPulse) {
      if (this.sweepShiftCount) {
        timerDelta = this.timerMax >>> this.sweepShiftCount;
        // TODO broken sweep, see last line on http://wiki.nesdev.com/w/index.php/APU_Sweep
      }

      if (this.sweepNegate) {
        timerDelta = -timerDelta;
      }

      targetTimer = this.timerMax + timerDelta;

      if (
        this.timerMax >= 8 &&
        this.timerMax <= 0x7ff
      ) {
        if (this.sweepEnabled) {
          this.timerMax = targetTimer;
        }
        this.silence = false;
      } else {
        this.silence = true;
      }

      this.sweepDividerCount = this.sweepDividerPeriod;
    } else if (this.sweepDividerCount) {
      this.sweepDividerCount--;
    }
  }

  doTimer() {
    if (!this.silence && this.lengthCounter && this.timerMax) {
      if (this.timer) {
        this.timer--;
      } else {
        this.timer += this.timerMax;
        this.pulseCounter = (this.pulseCounter + 1) & 7;
        this.sample = pulseDutyLookup[(this.duty << 3) + this.pulseCounter] * this.masterVolume;
      }
    } else {
      this.sample = 0;
    }
  }

  writeRegister(index, value) {
    switch (index) {
      case 0:
        this.duty = (value & 0xc0) >> 6;
        this.setEnvelope(value);
        break;
      case 1:
        this.sweepStart = true;
        this.sweepEnabled = !!(value & 0x80);
        this.sweepDividerPeriod = ((value & 0x70) >> 4) + 1;
        this.sweepNegate = !!(value & 0x8);
        this.sweepShiftCount = value & 0x7;

        break;
      case 2:
        this.timer = this.timerMax = (this.timerMax & ~0xff) | value;
        break;
      case 3:
        // set timer high and length counter
        this.timer = this.timerMax = (this.timerMax & ~0xff00) | ((value & 0x7) << 8);
        this.setLengthCounter(value >>> 3);

        // restart envelope and sequencer
        this.envelopeStart = true;
        this.pulseCounter = 0;

        break;
    }

    this.silence = (this.timerMax < 8);
  }
}

const pulseDutyLookup = [
  0, 1, 0, 0, 0, 0, 0, 0,  // duty 0
  0, 1, 1, 0, 0, 0, 0, 0,  // duty 1
  0, 1, 1, 1, 1, 0, 0, 0,  // duty 2
  1, 0, 0, 1, 1, 1, 1, 1,  // duty 3
];

export default Pulse;
