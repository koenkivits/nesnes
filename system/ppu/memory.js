"use strict";

function Memory( ppu ) {
	this.ppu = ppu;
	this.system = ppu.system;
	this.palette = new Uint8Array( 0x20 );
	this.cartridge = null;

	Object.preventExtensions( this );
}

Memory.prototype = {
	loadCartridge: function( cartridge ) {
		this.cartridge = cartridge;
	},

	read: function( address ) {
		return this._readWrite( address, 0, 0 );
	},

	write: function( address, value ) {
		this._readWrite( address, value, 1 );
	},

	_readWrite: function( address, value, write ) {	
		var relativeAddress = 0;
		address &= 0x3fff;

		if ( !( address & ~0x1fff ) ) {
			if ( write ) {
				return this.cartridge.writeCHR( address, value );
			} else {
				return this.cartridge.readCHR( address );
			}
		} else if ( !( address & ~0x2fff ) ) {
			relativeAddress = address & 0x1fff;

			if ( write ) {
				this.cartridge.writeNameTable( relativeAddress, value );
				return 0;
			} else {
				return this.cartridge.readNameTable( relativeAddress );
			}
		} else if ( address < 0x3f00 ) {
			// mirror of 0x2000-0x2fff
			return this._readWrite( address - 0x1000, value, write );
		} else if ( address < 0x3fff ) {
			relativeAddress = address & 31;

			if ( 
				( (relativeAddress & 3) === 0 )
			) {
				relativeAddress &= ~16;
			}

			if ( write ) {
				this.palette[ relativeAddress ] = value;
				return 0;
			} else {
				return this.palette[ relativeAddress ];
			}

			return 0;
		}
	}	
};

module.exports = Memory;