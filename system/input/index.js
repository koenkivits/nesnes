var Keyboard = require("./keyboard");
var StandardController = require("../controllers/standardcontroller");

function Input( system  ) {
	this.system = system;
	this.controllers = system.controllers;
	this.inputHandlers = new Array( 2 );

	this.initConfig();
	this.enable();
}

Input.prototype = {
	/**
	 * Enable all input.
	 */
	enable: function() {
		this._setEnabled( true );
	},

	/**
	 * Disable all input.
	 */
	disable: function() {
		this._setEnabled( false );
	},

	/**
	 * Set enabled yes/no.
	 * Helper method for enable and disable.
	 * @param {boolean} enabled - If true enable, otherwise disable.
	 */
	_setEnabled: function( enabled ) {
		var handler,
			method = enabled ? "enable" : "disable";

		for ( var i = 0; i < this.inputHandlers.length; i++ ) {
			handler = this.inputHandlers[ i ];
			if ( handler )  {
				handler[ method ]();
			}
		}
	},

	/**
	 * Initialize total input config.
	 */
	initConfig: function() {
		var item,
		    config = this.config = this.system.config.input;

		for ( var i = 0; i < config.length; i++ ) {
			item = config[ i ];
			
			this.setController( i, item.type );
			this.setInputHandler( i, item.input, item.config );
		}
	},

	/**
	 * Connect a controller of given type.
	 * @param {number} index - Either 0 or 1.
	 * @param {string} type - Type of controller (eg. 'standard').
	 */
	setController: function( index, type ) {
		var Controller = controllerMap[ type ];
		this.controllers.connect( index, new Controller() );
	},

	/**
	 * Bind input handler to controller.
	 * @param {number} index - Either 0 or 1.
	 * @param {string} input - Type of input handler (eg. 'keyboard').
	 * @param {object} config - Configuration for keyboard handler.
	 */
	setInputHandler: function( index, input, config ) {
		var InputHandler = inputHandlerMap[ input ],
			controller = this.controllers.get( index );
		this.inputHandlers[ index ] = new InputHandler( controller, config );
	}
};

var controllerMap = {
	"standard": StandardController
};

var inputHandlerMap = {
	"keyboard": Keyboard
};

module.exports = Input;