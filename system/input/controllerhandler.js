function ControllerHandler( controller, config ) {
	this.controller = controller;

	if ( config ) {
		this.configure( config );
	}
	this.initialize();
	this.enabled = false;

	this._pressed = {};
}

ControllerHandler.prototype = {
	/**
	 * Initialize handler.
	 * Will be called from constructor, should be overwritten by subclass.
	 */
	initialize: function() {
	},

	/**
	 * Load configuration.
	 * @param {object} config
	 */
	configure: function( config ) {
		this.config = config;
		this._configure();
	},

	/**
	 * Configuration handler.
	 * Called from configure(), should be overwritten by subclass.
	 */
	_configure: function() {},

	/**
	 * Bind keyboard events.
	 */
	enable: function() {
		// make sure event handlers aren't bound twice
		if ( this.isSupported() && !this.enabled ) {
			this.enabled = true;
			this._enable();
		}
	},

	/**
	 * Enable handler.
	 * Called from enable(), should be overwritten by subclass.
	 */
	_enable: function() {},

	/**
	 * Unbind keyboard events.
	 */
	disable: function() {
		if ( this.enabled ) {
			this.enabled = false;
			this._disable();
		}
	},

	/**
	 * Disable handler.
	 * Called from disable(), should be overwritten by subclass.
	 */
	_disable: function() {},

	/**
	 * Check if controller hander is supported.
	 * Should be overwitten by subclass.
	 */
	isSupported: function() {
		return true;
	},

	/**
	 * Proxy controller press calls.
	 * Keeps track of which buttons are pressed by this handler.
	 */
	press: function( button ) {
		this._pressed[ button ] = true;
		this.controller.press( button );
	},

	/**
	 * Proxy controller depress calls.
	 * Only allows depresses of buttons pressed by this handler. This allows for
	 * multiple handlers to control the same controller.
	 */
	depress: function( button ) {
		if ( button in this._pressed ) {
			delete this._pressed[ button ];
			this.controller.depress( button );
		}
	}
};

/**
 * Quick class 'extend' method.
 * Not all target browsers support ES6, I can't precompile because of
 * performance issues, and I only need it here (so I won't drag in an
 * extra dependency).
 */
ControllerHandler.extend = function( proto ) {
	Handler = function( controller, config ) {
		ControllerHandler.call( this, controller, config );
	};

	Handler.prototype = Object.create( ControllerHandler.prototype );

	for ( var key in proto ) {
		Handler.prototype[ key ] = proto[ key ];
	}

	return Handler;
};

module.exports = ControllerHandler;
