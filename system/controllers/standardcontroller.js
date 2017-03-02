class StandardController {
  constructor() {
    this.data = 0;
    this.mask = 0;
    this.strobe = 0;

    Object.preventExtensions(this);
  }

  /**
   * Press a button.
   * @param {string} button - The button to press ('a', 'b', 'start', 'select', 'left', 'right', 'up', 'down').
   */
  press(button) {
    this._press(getBitMask(button));
  }

  /**
   * Deress a button.
   * @param {string} button - The button to depress ('a', 'b', 'start', 'select', 'left', 'right', 'up', 'down').
   */
  depress(button) {
    this._depress(getBitMask(button));
  }

  /**
   * Press several buttons.
   * Note: prevents pressing of 'impossible' combinations on the NES (like left+right).
   * @param {number} bitmask - An 8-bit bitmask of buttons to press.
   */
  _press(bitmask) {
    // prevent input that would be impossible with a standard controller
    // (this can cause some seriously weird behavior in some games)
    if (bitmask & 3) {
      // prevent left + right
      this._depress(3);
    } else if (bitmask & 12) {
      // prevent up + down
      this._depress(12);
    }

    this.data |= bitmask;
  }

  /**
   * Depress several buttons.
   * @param {number} bitmask - An 8-bit bitmask of buttons to press.
   */
  _depress(bitmask) {
    this.data &= ~bitmask;
  }

  /**
   * Read controller output.
   * The output is returned 1 bit at a time.
   */
  read() {
    if (!this.mask) {
      // all buttons have been output, always return 1
      return 1;
    }

    const result = this.data & this.mask;

    if (!this.strobe) {
      this.mask >>= 1;
    }

    return +!!result;
  }

  /**
   * Set controller strobe.
   * If strobe is high, bit shifter is reset until strobe is low.
   * @param {number} value - If truthy strobe is high, otherwise strobe is low.
   */
  setStrobe(value) {
    if (value) {
      this.mask = 0x80;
    }
    this.strobe = value;
  }
}

/**
 * Convert a button string ('a', 'start', etc) to an internal bitmask.
 */
function getBitMask(button) {
  return buttonMap[button.toLowerCase()] || 0;
}

const buttonMap = {
  a: 128,
  b: 64,
  select: 32,
  start: 16,
  up: 8,
  down: 4,
  left: 2,
  right: 1,
};

export default StandardController;
