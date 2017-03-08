class ControllerHandler {
  /**
   * Check if controller handler is supported.
   * Should be overwritten by subclass.
   */
  static isSupported() {
    return true;
  }

  constructor(controller, config) {
    this.controller = controller;

    if (config) {
      this.configure(config);
    }
    this.initialize();
    this.enabled = false;

    this._pressed = {};
  }

  /**
   * Initialize handler.
   * Will be called from constructor, should be overwritten by subclass.
   */
  initialize() {
  }

  /**
   * Load configuration.
   * @param {object} config
   */
  configure(config) {
    this.config = config;
    this._configure();
  }

  /**
   * Configuration handler.
   * Called from configure(), should be overwritten by subclass.
   */
  _configure() {
  }

  /**
   * Bind keyboard events.
   */
  enable() {
    // make sure event handlers aren't bound twice
    if (this.isSupported() && !this.enabled) {
      this.enabled = true;
      this._enable();
    }
  }

  /**
   * Enable handler.
   * Called from enable(), should be overwritten by subclass.
   */
  _enable() {
  }

  /**
   * Unbind keyboard events.
   */
  disable() {
    if (this.enabled) {
      this.enabled = false;
      this._disable();
    }
  }

  /**
   * Disable handler.
   * Called from disable(), should be overwritten by subclass.
   */
  _disable() {
  }

  /**
   * Proxy controller press calls.
   * Keeps track of which buttons are pressed by this handler.
   */
  press(button) {
    this._pressed[button] = true;
    this.controller.press(button);
  }

  /**
   * Proxy controller depress calls.
   * Only allows depresses of buttons pressed by this handler. This allows for
   * multiple handlers to control the same controller.
   */
  depress(button) {
    if (button in this._pressed) {
      delete this._pressed[button];
      this.controller.depress(button);
    }
  }
}

export default ControllerHandler;
