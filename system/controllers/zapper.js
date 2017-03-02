/**
 * The Zapper (for Duck Hunt, etc).
 * Doesn't fully work yet.
 */

class Zapper {
  constructor(system) {
    this.system = system;

    this.trigger = false;

    this.x = 0;
    this.y = 0;
  }

  shoot(x, y) {
    this.x = x;
    this.y = y;

    this.trigger = true;
  }

  release() {
    this.trigger = false;
  }

  getLight() {
    const ppu = this.system.ppu;
    const video = ppu.output;
    const width = ppu.outputWidth;
    const pixelIndex = (this.y * width * 4) + (this.x * 4);

    return (Math.max(video[pixelIndex], video[pixelIndex + 1], video[pixelIndex + 2]) < 200);
  }

  read() {
    return (
      (this.getLight() << 3) |
      (this.trigger << 4)
    );
  }

  write(/* value */) {
    // no strobe for the zapper
  }
}

export default Zapper;
