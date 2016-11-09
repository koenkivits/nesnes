var ControllerHandler = require( "./controllerhandler" );

var Keyboard = ControllerHandler.extend({
	initialize: function() {
		this.handlers = {};
	},

	/**
	 * Load configuration.
	 * @param {object} config - An mapping of keyboard keys to controller buttons.
	 */
	_configure: function() {
		this.initKeyCodes();
	},

	/**
	 * Bind keyboard events.
	 */
	_enable: function() {
		this.bindHandler( "keydown" );
		this.bindHandler( "keyup" );
	},

	/**
	 * Unbind keyboard events.
	 */
	_disable: function() {
		this.unbindHandler( "keydown" );
		this.unbindHandler( "keyup" );
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
				self[ handler ]( self.keyCodes[ keyCode ] );
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
});

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
