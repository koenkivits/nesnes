import ControllerHandler from './controllerhandler';

class Gamepad extends ControllerHandler {
  /**
   * Check if gamepads are supported
   */
  static isSupported() {
    return (
      typeof window !== 'undefined' &&
      window.navigator &&
      ('getGamepads' in window.navigator)
    );
  }

  /**
   * Load configuration.
   * @param {object} config - A mapping of gamepad buttons/axes to controller
   *                          buttons. See config.json for an example.
   */
  _configure() {
    this.config.index = this.config.index || 0;
  }

  /**
   * Enable gamepad input
   */
  _enable() {
    this.initConnection();
  }

  /**
   * Disable gamepad input
   */
  _disable() {
    this.clearConnection();
    this.stopListening();
  }

  /**
   * Initialize connection with gamepad
   */
  initConnection() {
    if (this._connected || !this.enabled) {
      return;
    }

    // just use an interval instead of the gamepadconnected event (which
    // isn't supported in every browser -- looking at you, Chrome)
    const input = this;
    this.checkConnectionInterval = setInterval(() => {
      if (input.initGamepad()) {
        input.clearConnection();
      }
    }, 50);
  }

  /**
   * Clear the listener for the gamepad connection
   */
  clearConnection() {
    if (this.checkConnectionInterval) {
      clearInterval(this.checkConnectionInterval);
      this.checkConnectionInterval = null;
    }
  }

  /**
   * Initialize gamepad
   */
  initGamepad() {
    if (this._connected) {
      return;
    }

    const gamepad = navigator.getGamepads()[this.config.index];
    if (gamepad) {
      this.startListening();
      return true;
    }

    return false;
  }

  /**
   * Start listening for gamepad input
   */
  startListening() {
    this._connected = true;

    const input = this;
    const listen = () => {
      const gamepad = navigator.getGamepads()[input.config.index];

      if (gamepad && gamepad.connected) {
        input.handleButtons(gamepad);
        input.handleAxes(gamepad);

        requestAnimationFrame(listen);
      } else {
        // gamepad no longer connected
        input.stopListening();
      }
    };

    requestAnimationFrame(listen);
  }

  /**
   * Stop listening for gamepad input
   */
  stopListening() {
    this._connected = false;
    this.initConnection();
  }

  /**
   * Translate gamepad buttons into controller button presses
   * @param {Gamepad} gamepad
   */
  handleButtons(gamepad) {
    const pressed = {};
    const buttonConfig = this.config.buttons;
    const buttons = gamepad.buttons;

    // initialize pressed state for every configured button
    for (let index in buttonConfig) {
      pressed[buttonConfig[index]] = false;
    }

    // check every button to see if it's configured and if so, track
    // pressed state
    for (let index = 0; index < buttons.length; index++) {
      let button = buttonConfig[index];
      if (button) {
        pressed[button] = pressed[button] || buttons[index].pressed;
      }
    }

    // translate pressed state to controlled input
    for (let button in pressed) {
      if (pressed[button]) {
        this.press(button);
      } else {
        this.depress(button);
      }
    }
  }

  /*
   * Translate gamepad axes into controller button presses
   * @param {Gamepad} gamepad
   */
  handleAxes(gamepad) {
    // map vertical axes to up and down buttons
    // map horizontal axes to left and right buttons
    const axisMap = {
      vertical: ['up', 'down'],
      horizontal: ['left', 'right'],
    };
    const axisUsed = {};
    const axesConfig = this.config.axes;
    const axes = gamepad.axes;

    // track which axes we've already used, so we can press and depress
    // buttons accordingly
    for (let axis in axisMap) {
      axisUsed[axis] = false;
    }

    // read axis input and (de)press buttons accordingly
    for (let index = 0; index < axes.length; index++) {
      let axis = axesConfig[index];
      let value = axes[index];

      if (axis && value) {
        axisUsed[axis] = true;

        // axis can go only one way (no up AND down, for example), so make sure
        // only 1 gets pressed
        let directions = axisMap[axis];
        this.press(value < 0 ? directions[0] : directions[1]);
        this.depress(value < 0 ? directions[1] : directions[0]);
      }
    }

    // depress all buttons on an axis if axis isn't used at all
    for (let axis in axisUsed) {
      if (axisUsed[axis]) {
        continue;
      }

      let directions = axisMap[axis];
      for (let index = 0; index < directions.length; index++) {
        this.depress(directions[index]);
      }
    }
  }
}

export default Gamepad;
