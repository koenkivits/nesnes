// const CONTROLLER_COUNT = 2;

class Controllers {
  constructor(system) {
    this.system = system;

    this.controller0 = new NoController();
    this.controller1 = new NoController();

    // this.controllers = new Array(CONTROLLER_COUNT);
    this.strobe = 0;
  }

  /**
   * Get a connected controller.
   * @param {number} index - Either 0 or 1.
   */
  get(index) {
    if (index) {
      return this.controller1;
    } else {
      return this.controller0;
    }
  }

  /**
   * Connect a controller to the system.
   * @param {number} index - Either 0 or 1.
   * @param {object} controller - A controller object.
   */
  connect(index, controller) {
    if (index) {
      this.controller1 = controller;
    } else {
      this.controller0 = controller;
    }
  }

  /**
   * Read controller data at given index.
   * This is the handler for reading 0x4016 or 0x4017.
   * @param {number} index - either 0 or 1.
   */
  read(index) {
    return this.get(index).read();
  }

  /**
   * Write controller strobe.
   * This is the handler for writes to 0x4016.
   */
  write(value) {
    const strobe = value & 1;

    this.controller0.setStrobe(strobe);
    this.controller1.setStrobe(strobe);
  }
}

/**
 * If no controller is connected, this controller is implicitly connected.
 * This way we don't have to implement safeguards against unconnected controllers.
 */
class NoController {
  read(/* index */) {
    return 0;
  }

  setStrobe() {
    // do nothing
  }
}

export default Controllers;
