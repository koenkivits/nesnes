"use strict";

var Channel = require("./channel");

function Triangle() {
	this.linearCounter = 0;
	this.linearCounterMax = 0;
	this.linearCounterControl = false;
	this.linearCounterStart = false;

	this.timerMax = 0;
	this.timer = 0;

	this.sequenceCounter = 0;

	Channel.call( this );
	Object.preventExtensions( this );
}

Triangle.prototype = new Channel();

Triangle.prototype.doLinearCounter = function() {
	if ( this.linearCounterStart ) {
		this.linearCounter = this.linearCounterMax; 
	} else if ( this.linearCounter ) {
		this.linearCounter--;
	}

	if ( !this.linearCounterControl ) {
		this.linearCounterStart = false;
	}
};

Triangle.prototype.doTimer = function() {
	if ( this.timerMax ) {
		this.timer -= 2;

		if ( this.timer <= 0 ) {
			this.timer += this.timerMax;
			this.sequenceCounter = ( this.sequenceCounter + 1 ) & 31;
			this.sample = sequence[ this.sequenceCounter ];
		}
	}

	if ( !this.lengthCounter || !this.linearCounter ) {
		this.sample = 0;
	}
};

Triangle.prototype.writeRegister = function( index, value ) {
	switch ( index ) {
	case 0:
		this.linearCounterMax = value & ~0x80;
		this.lengthCounterHalt = this.linearCounterControl = !!( value & 0x80 );
		break;
	case 1:
		// unused
		break;
	case 2:
		// set timer low
		this.timer = this.timerMax = ( this.timerMax & ~0xff ) | value;
		break;
	case 3:
		// set timer high, set length counter and linear counter reload flag
		this.timer = this.timerMax = ( this.timerMax & ~0xff00 ) | ( ( value & 0x7 ) << 8 );
		this.setLengthCounter( value >>> 3 );
		this.linearCounterStart = true;
		
		break;
	}
};

var sequence = [
	15, 14, 13, 12, 11, 10,  9,  8,  7,  6,  5,  4,  3,  2,  1,  0,
 	0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15
];

module.exports = Triangle;