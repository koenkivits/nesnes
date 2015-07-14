"use strict";

function StandardController() {
	this.data = 0;
	this.mask = 0;
	this.strobe = 0;

	Object.preventExtensions( this );
}

StandardController.prototype = {
	/**
	 * Press a button.
	 * @param {string} button - The button to press ('a', 'b', 'start', 'select', 'left', 'right', 'up', 'down').
	 */
	press: function( button ) {
		this._press( getBitMask(button) );
	},

	/**
	 * Deress a button.
	 * @param {string} button - The button to depress ('a', 'b', 'start', 'select', 'left', 'right', 'up', 'down').
	 */
	depress: function( button ) {
		this._depress( getBitMask(button) );
	},

	/**
	 * Press several buttons.
	 * Note: prevents pressing of 'impossible' combinations on the NES (like left+right).
	 * @param {number} bitmask - An 8-bit bitmask of buttons to press.
	 */
	_press: function( bitmask ) {
		// prevent input that would be impossible with a standard controller
		// (this can cause some seriously weird behavior in some games)
		if ( bitmask & 3 ) {
			// prevent left + right
			this._depress( 3 );
		} else if ( bitmask & 12 ) {
			// prevent up + down
			this._depress( 12 );
		}

		this.data |= bitmask;
	},

	/**
	 * Dress several buttons.
	 * @param {number} bitmask - An 8-bit bitmask of buttons to press.
	 */
	_depress: function( bitmask ) {
		this.data &= ~bitmask;
	},

	/**
	 * Read controller output.
	 * The output is returned 1 bit at a time.
	 */
	read: function() {
		if ( !this.mask ) {
			// all buttons have been output, always return 1
			return 1;
		}

		var result = this.data & this.mask;

		if ( !this.strobe ) {
			this.mask >>= 1;
		}

		return +!!result;
	},

	/**
	 * Set controller strobe.
	 * If strobe is high, bit shifter is reset until strobe is low.
	 * @param {number} value - If truthy strobe is high, otherwise strobe is low.
	 */
	setStrobe: function( value ) {
		if ( value ) {
			this.mask = 0x80;
		}
		this.strobe = value;
	}
};

/**
 * Convert a button string ('a', 'start', etc) to an internal bitmask.
 */
function getBitMask( button ) {
	return buttonMap[ button.toLowerCase() ] || 0;
}

var buttonMap = {
	"a": 128,
	"b": 64,
	"select": 32,
	"start": 16,
	"up": 8,
	"down": 4,
	"left": 2,
	"right": 1
};

module.exports = StandardController;