/**
 * The Zapper (for Duck Hunt, etc).
 * Doesn't fully work yet.
 */

function Zapper( system ) {
	this.system = system;

	this.trigger = false;

	this.x = 0;
	this.y = 0;
}

Zapper.prototype = {
	shoot: function( x, y ) {
		this.x = x;
		this.y = y;

		this.trigger = true;
	},

	release: function() {
		this.trigger = false;
	},

	getLight: function() {
		var ppu = this.system.ppu,
			video = ppu.output,
			width = ppu.outputWidth,
			pixelIndex = ( this.y * width * 4 ) + ( this.x * 4 );

		return ( Math.max( video[ pixelIndex ], video[ pixelIndex + 1 ], video[ pixelIndex + 2 ] ) < 200 );
	},

	read: function() {
		return (
			( this.getLight() << 3 ) |
			( this.trigger << 4 )
		);
	},

	write: function( value ) {
		// jshint unused: false
		// no strobe for the zapper
		return;
	}
};

module.exports = Zapper;