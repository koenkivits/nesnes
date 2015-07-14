function Keyboard( controller, config ) {
	this.controller = controller;
	this.handlers = {};

	if ( config ) {
		this.configure( config );
	}

	this.enabled = false;
}

Keyboard.prototype = {
	/**
	 * Load configuration.
	 * @param {object} config - An mapping of keyboard keys to controller buttons.
	 */
	configure: function( config ) {
		this.config = config;
		this.initKeyCodes();
	},

	/**
	 * Bind keyboard events.
	 */
	enable: function() {
		// make sure event handlers aren't bound twice
		if ( !this.enabled ) {
			this.bindHandler( "keydown" );
			this.bindHandler( "keyup" );
		}

		this.enabled = true;
	},

	/**
	 * Unbind keyboard events.
	 */
	disable: function() {
		this.unbindHandler( "keydown" );
		this.unbindHandler( "keyup" );

		this.enabled = false;
	},

	/**
	 * Bind keyboard event of specific type.
	 * @param {string} type - Either 'keydown' or 'keyup'.
	 */
	bindHandler: function( type ) {
		window.addEventListener( type, this.getHandler( type ) );
	},

	/**
	 * Unbind keyboard event of specific type.
	 * @param {string} type - Either 'keydown' or 'keyup'.
	 */
	unbindHandler: function( type ) {
		window.removeEventListener( type, this.getHandler( type ) );
	},

	/**
	 * Get keyboard event handler of specific type.
	 * @param {string} type - Either 'keydown' or 'keyup'.
	 */
	getHandler: function( type ) {
		if ( this.handlers[ type ] ) {
			return this.handlers[ type ];
		}

		var self = this,
		    handler = type === "keydown" ? "press" : "depress";

		this.handlers[ type ] = function( e ) {
			var keyCode = e.keyCode;

			if ( keyCode in self.keyCodes ) {
				self.controller[ handler ]( self.keyCodes[ keyCode ] );
				e.preventDefault();
			}
		};

		return this.handlers[ type ];
	},

	/**
	 * Initialize keycodes from config.
	 * Converts config key strings to numeric keycodes that can be used in event handlers.
	 */
	initKeyCodes: function() {
		var name, keyCode,
		    keyCodes = {};

		for ( name in this.config ) {
			if ( name in keyCodeMap ) {
				// special cases ('ctrl', 'shift', etc)
				keyCode = keyCodeMap[ name ];
			} else {
				// letters and numbers
				keyCode = name.toUpperCase().charCodeAt();
			}

			keyCodes[ keyCode ] = this.config[ name ];
		}

		this.keyCodes = keyCodes;
	}
};

var keyCodeMap = {
	"backspace": 8,
	"tab": 9,
	"return": 13,
	"shift": 16,
	"ctrl": 17,
	"alt": 18,
	"capslock": 20,
	"space": 32,
	"left": 37,
	"up": 38,
	"right": 39,
	"down": 40,
};

module.exports = Keyboard;