function Gamepad( controller, config ) {
	this.controller = controller;
	this.handlers = {};

	if ( config ) {
		this.configure( config );
	}

	this.enabled = false;
}

Gamepad.prototype = {
	/**
	 * Load configuration.
	 * @param {object} config - A mapping of gamepad buttons/axes to controller
	 *                          buttons. See config.json for an example.
	 */
	configure: function( config ) {
		this.config = config;
		this.config.index = config.index || 0;
	},

	/**
	 * Enable gamepad input
	 */
	enable: function() {
		if ( this.isSupported() && !this.enabled ) {
			this.enabled = true;
			this.initConnection();
		}
	},

	/**
	 * Check if gamepads are supported
	 */
	isSupported: function() {
		return (
			typeof window !== "undefined" &&
			window.navigator &&
			("getGamepads" in window.navigator)
		);
	},

	/**
     * Disable gamepad input
	 */
	disable: function() {
		this.enabled = false;
		this.clearConnection();
		this.stopListening();
	},

	/**
	 * Initialize connection with gamepad
	 */
	initConnection: function() {
		if ( this._connected || !this.enabled ) {
			return;
		}

		// just use an interval instead of the gamepadconnected event (which
		// isn't supported in every browser -- looking at you, Chrome)
		var input = this;
		this.checkConnectionInterval = setInterval(function() {
			if ( input.initGamepad() ) {
				input.clearConnection();
			}
		}, 50);
	},

	/**
	 * Clear the listener for the gamepad connection
	 */
	clearConnection: function() {
		if ( this.checkConnectionInterval ) {
			clearInterval( this.checkConnectionInterval );
			this.checkConnectionInterval = null;
		}
	},

	/**
	 * Initialize gamepad
	 */
	initGamepad: function() {
		if ( this._connected ) {
			return;
		}

		var gamepad = navigator.getGamepads()[ this.config.index ];
		if ( gamepad ) {
			this.startListening();
			return true;
		}

		return false;
	},

	/**
	 * Start listening for gamepad input
	 */
	startListening: function() {
		this._connected = true;

		var input = this;
		requestAnimationFrame(function listen() {
			var gamepad = navigator.getGamepads()[ input.config.index ];

			if ( gamepad && gamepad.connected ) {
				input.handleButtons(gamepad);
				input.handleAxes(gamepad);

				requestAnimationFrame(listen);
			} else {
				// gamepad no longer connected
				input.stopListening();
			}
		});
	},

	/**
	 * Stop listening for gamepad input
	 */
	stopListening: function() {
		this._connected = false;
		this.initConnection();
	},

	/**
	 * Translate gamepad buttons into controller button presses
	 * @param {Gamepad} gamepad
	 */
	handleButtons: function(gamepad) {
		var button, index,
			pressed = {},
		    buttonConfig = this.config.buttons,
		    buttons = gamepad.buttons;

		// initialize pressed state for every configured button
		for ( index in buttonConfig ) {
			pressed[ buttonConfig[ index ] ] = false;
		}

		// check every button to see if it's configured and if so, track
		// pressed state
		for ( index = 0; index < buttons.length; index++ ) {
			button = buttonConfig[ index ];
			if ( button ) {
				pressed[ button ] = pressed[ button ] || buttons[ index ].pressed;
			}
		}

		// translate pressed state to controlled input
		for ( button in pressed ) {
			if ( pressed[ button ] ) {
				this.controller.press( button );
			} else {
				this.controller.depress( button );
			}
		}
	},

	/*
	 * Translate gamepad axes into controller button presses
	 * @param {Gamepad} gamepad
	 */
	handleAxes: function(gamepad) {
		var axis, value, directions,

			// map vertical axes to up and down buttons
			// map horizontal axes to left and right buttons
			axisMap = {
				"vertical": [ "up", "down" ],
				"horizontal": [ "left", "right" ]
			},
			axisUsed = {},
		    axesConfig = this.config.axes,
			axes = gamepad.axes;

		// track which axes we've already used, so we can press and depress
		// buttons accordingly
		for ( axis in axisMap ) {
			axisUsed[ axis ] = false;
		}

		// read axis input and (de)press buttons accordingly
		for ( var index = 0; index < axes.length; index++ ) {
			axis = axesConfig[ index ];
			value = axes[ index ];

			if ( axis && value ) {
				axisUsed[ axis ] = true;

				// axis can go only one way (no up AND down, for example), so make sure
				// only 1 gets pressed
				directions = axisMap[ axis ];
				this.controller.press( value < 0 ? directions[ 0 ] : directions[ 1 ]);
				this.controller.depress( value < 0 ? directions[ 1 ] : directions[ 0 ]);
			}
		}

		// depress all buttons on an axis if axis isn't used at all
		for ( axis in axisUsed ) {
			if ( axisUsed[ axis ] ) {
				continue;
			}

			directions = axisMap[ axis ];
			for ( index = 0; index < directions.length; index++ ) {
				this.controller.depress( directions[ index ] );
			}
		}
	}
};

module.exports = Gamepad;
