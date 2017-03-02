import Gamepad from './gamepad';
import Keyboard from './keyboard';
import StandardController from '../controllers/standardcontroller';

class Input {
  constructor(system) {
    this.system = system;
    this.controllers = system.controllers;
    this.inputHandlers = new Array(2);

    this.initConfig();

    // only enable input in browsers
    if (typeof window !== 'undefined') {
      this.enable();
    }
  }

  /**
   * Enable all input.
   */
  enable() {
    this._setEnabled(true);
  }

  /**
   * Disable all input.
   */
  disable() {
    this._setEnabled(false);
  }

  /**
   * Set enabled yes/no.
   * Helper method for enable and disable.
   * @param {boolean} enabled - If true enable, otherwise disable.
   */
  _setEnabled(enabled) {
    const method = enabled ? 'enable' : 'disable';

    this._enabled = enabled;
    for (let i = 0; i < this.inputHandlers.length; i++) {
      let handlers = this.inputHandlers[i];
      if (handlers) {
        for (let type in handlers) {
          handlers[type][method]();
        }
      }
    }
  }

  /**
   * Initialize total input config.
   */
  initConfig() {
    const config = this.config = this.system.config.input;

    for (let i = 0; i < config.length; i++) {
      let item = config[i];

      this.setController(i, item.type);

      let controls = item.controls;
      if (!Array.isArray(controls)) {
        controls = [controls];
      }

      for (let j = 0; j < controls.length; j++) {
        this.configure(i, controls[j].type, controls[j].config);
      }
    }
  }

  /**
   * Connect a controller of given type.
   * @param {number} index - Either 0 or 1.
   * @param {string} type - Type of controller (eg. 'standard').
   */
  setController(index, type) {
    const Controller = controllerMap[type];
    this.controllers.connect(index, new Controller());
  }

  /**
   * Configure the input for a controller
   * @param {number} index - Either 0 or 1
   * @param {string} type - Type of input handler (either 'keyboard' or 'gamepad')
   * @param {object} config - Configuration for input handler (see config.json for examples)
   */
  configure(index, type, config) {
    const InputHandler = inputHandlerMap[type];
    const controller = this.controllers.get(index);

    this.initInputHandlers(index);
    let currentHandler = this.inputHandlers[index][type];
    if (currentHandler) {
      currentHandler.disable();
    }

    this.inputHandlers[index][type] = new InputHandler(controller, config);

    if (this._enabled) {
      this.inputHandlers[index][type].enable();
    }
  }

  initInputHandlers(index) {
    this.inputHandlers[index] = this.inputHandlers[index] || {};
  }
}

const controllerMap = {
  standard: StandardController,
};

const inputHandlerMap = {
  gamepad: Gamepad,
  keyboard: Keyboard,
};

export default Input;
