const colors = initColors();
const reversedBytes = initReversedBytes();
const reversedTiles = initReversedTiles();

/**
 * Get the colors of a tile.
 * Note that a 'tile' is a 16 bit word, with the low colors as the first 8 bits and the high
 * colors as the last 8 bits.
 */
function getColors(tile) {
  const offset = tile << 8;
  return colors.subarray(offset, offset + 8);
}

/**
 * Reverse all the pixels in a tile.
 * Note that a 'tile' is a 16 bit word, with the low colors as the first 8 bits and the high
 * colors as the last 8 bits.
 */
function reverseTile(tile) {
  return reversedTiles[tile];
}

/**
 * Reverse all the bits in a byte.
 */
function reverseByte(byte) {
  return reversedBytes[byte];
}

/**
 * Initialize lookup table for getColors().
 */
function initColors() {
  const result = new Uint8Array(0x1000000);

  for (let low = 0; low < 0x100; low++) {
    for (let high = 0; high < 0x100; high++) {
      addTile(low, high);
    }
  }

  return result;

  function addTile(low, high) {
    const offset = (low << 16) | (high << 8);

    for (let i = 0; i < 8; i++) {
      let colorLow = (low & 1);
      let colorHigh = (high & 1) << 1;

      result[offset + i] = (colorHigh | colorLow);

      low >>= 1;
      high >>= 1;
    }
  }
}

/**
 * Initialize lookup table for reverseTile().
 */
function initReversedTiles() {
  const result = new Uint16Array(0x10000);

  for (let low = 0; low < 0x100; low++) {
    for (let high = 0; high < 0x100; high++) {
      let tile = (low << 8) | high;
      result[tile] = (reverseByte(low) << 8) | reverseByte(high);
    }
  }

  return result;
}

/**
 * Initialize lookup table for reverseByte().
 */
function initReversedBytes() {
  const result = new Uint8Array(0x100);

  for (let i = 0; i < 0x100; i++) {
    result[i] = calcReverse(i);
  }

  return result;

  function calcReverse(original) {
    let reverse = 0;

    for (let i = 7; i >= 0; i--) {
      reverse |= ((original & 1) << i);
      original >>>= 1;
    }

    return reverse;
  }
}

export default {
  getColors,
  reverseByte,
  reverseTile,
};
