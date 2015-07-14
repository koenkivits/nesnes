"use strict";

// bitmasks
const NAMETABLE_BITMASK = 0xc00,
      NAMETABLE_RESET = ~NAMETABLE_BITMASK;

function Background( ppu ) {
	this.ppu = ppu;
	this.memory = ppu.memory;

	this.enabled = true;
	this.enabledLeft = true;
	this.enabledPixel = false;

	this.loopyV = 0;
	this.loopyT = 0;
	this.loopyW = 0;
	this.loopyX = 0;

	this.baseTable = 0;

	this.copyingVertical = false;
	this.fetchingTiles = false;

	this.x = 0;
	this.scanlineColors = new Uint8Array( 0x200 );
	this.palette = 0;
	this.tileLow = 0;
	this.tileHigh = 0;
	this.tileMask = 0;

	Object.preventExtensions( this );
}

Background.prototype = {
	toggle: function( flag ) {
		this.enabled = !!flag;
	},

	toggleLeft: function( flag ) {
		this.enabledLeft = !!flag;
	},

	writeAddress: function( value ) {
		if ( this.loopyW ) {
			value &= 0xff;
			this.loopyT = ( this.loopyT & 0xff00 ) | value;
			this.loopyV = this.loopyT;
		} else {
			value &= 0x3f; // only use lowest 6 bits
			value = value << 8;
			this.loopyT = ( this.loopyT & 0x00ff ) | value; // note, also resets bit 14 of loopy_t (for unknown reason)
		}

		this.loopyW = !this.loopyW;
	},

	writeScroll: function( value ) {
		if ( this.loopyW ) {
			// set vertical scroll
			this.loopyT = this.loopyT & ~0x73e0;
			this.loopyT = this.loopyT | ( (value & 0x7) << 12 );
			this.loopyT = this.loopyT | ( (value & 0xf8) << 2 );

			this.loopyW = 0;
		} else {
			// set horizontal scroll
			this.loopyT = this.loopyT & 0x7fe0;
			this.loopyT |= ( value >> 3 );

			this.loopyX = value & ( 0x7 );

			this.loopyW = 1;
		}
	},

	evaluate: function() {
		this.initLineCycle();

		if ( this.fetchingTiles ) {
			this.fetchTileData();
		}

		if ( this.ppu.enabled ) {
			switch( this.ppu.lineCycle ) {
			case 256:
				// increment coarse X position every 8th cycle
				this.incrementVY();
				break;
			case 257:
				// reset horizontal at end of scanline
				// copy horizontal bits from loopy_t to loopy_v
				this.loopyV = ( this.loopyV & 0x7be0 ) | ( this.loopyT & 0x41f );
				break;
			}

			// finish initialization of loopy_v from loopy_t at end of pre-render scanline
			if ( this.copyingVertical ) {
				// copy vertical bits from loopy_t to loopy_v
				this.loopyV = ( this.loopyV & 0x41f ) | ( this.loopyT & 0x7be0 );
			}
		}
	},

	initLineCycle: function() {
		switch( this.ppu.lineCycle ) {
		case 1:
			this.enabledPixel = this.enabledLeft && this.ppu.inLeft8px;
			this.fetchingTiles = true;
			break;
		case 321:
			this.x = -this.loopyX - 8;
			this.fetchingTiles = true;
			break;
		case 9:
			this.enabledPixel = this.ppu.enabled;
			break;
		case 257:
		case 337:
			this.fetchingTiles = false;
			break;
		case 281:
			if ( this.ppu.scanline === -1 ) {
				this.copyingVertical = true;
			}
			break;
		case 304:
			if ( this.ppu.scanline === -1 ) {
				this.copyingVertical = false;
			}
			break;
		}
	},

	/**
	 * Increment coarse X scroll in loopy_v.
	 */
	incrementVX: function() {
		if ((this.loopyV & 0x1f) === 31) {
			// coarse X is maxed out, wrap around to next nametable
			this.loopyV &= ( 0xffff & ~0x1f );
			this.loopyV ^= 0x0400;
		}
		else {
			// we can safely increment loopy_v (since X is in the lowest bits)
			this.loopyV += 1;
		}
	},

	/**
	 * Increment Y scroll in loopy_v.
	 * TODO optimizations
	 */
	incrementVY: function() {
		if ((this.loopyV & 0x7000) != 0x7000) {
			// fine Y < 7: increment
			this.loopyV += 0x1000;
		} else {
			// fine Y at maximum: reset fine Y, increment coarse Y
			this.loopyV &= ~0x7000; 

			var coarseY = (this.loopyV & 0x03e0) >>> 5;
			if (coarseY == 29) {
				// switch vertical nametable
				coarseY = 0;
				this.loopyV ^= 0x0800;
			} else if (coarseY == 31) {
				// reset coarse Y without switching nametable
				coarseY = 0;
			} else {
				// simply increment coarse Y
				coarseY += 1;
			}

			// set coarse Y in loopy_v
			this.loopyV = (this.loopyV & ~0x03e0) | (coarseY << 5);
		}
	},

	setPixel: function() {
		var color = this.scanlineColors[ this.ppu.lineCycle - 1 ];

		if ( !this.enabledPixel ) {
			color = 0;
		}

		return color;
	},

	/**
	 * Fetch background tile data.
	 */
	fetchTileData: function() {
		this.setColor();

		if ( !(this.ppu.lineCycle & 7) && this.ppu.enabled ) {
			const nametableAddress = 0x2000 | (this.loopyV & 0x0fff),
			      attrAddress = 0x23c0 | (this.loopyV & 0x0c00) | ((this.loopyV >> 4) & 0x38) | ((this.loopyV >> 2) & 0x07),
			      nameTableByte = this.memory.read( nametableAddress ),
			      attribute = this.memory.read( attrAddress ),
		      
			      fineY = ( this.loopyV & 0x7000 ) >> 12,
			      tileAddress = ( nameTableByte << 4 ) + this.baseTable + fineY,

			      bitmapLow = this.memory.read( tileAddress ),
			      bitmapHigh = this.memory.read( tileAddress + 8 );

			var paletteMask = 3, // top left
			    paletteShift = 0,
			    palette = 0;

			if ( nametableAddress & 0x2 ) {
				// right
				paletteMask <<= 2;
				paletteShift = 2;
			}
			if ( nametableAddress & 0x40 ) {
				// bottom
				paletteMask <<= 4;
				paletteShift += 4;
			}

			palette = ( attribute & paletteMask ) >> paletteShift;

			// this.preloadTile( bitmapLow, bitmapHigh, palette );
			this.palette = palette << 2;
			this.tileLow = bitmapLow;
			this.tileHigh = bitmapHigh;
			this.tileMask = 0x80;

			this.incrementVX();
		}
	},

	setColor: function() {
		const low = !!( this.tileLow & this.tileMask ),
		      high = !!( this.tileHigh & this.tileMask ) << 1,
		      color = ( high | low );

		this.scanlineColors[ this.x++ & 0x1ff ] = color && ( this.palette | color );

		this.tileMask >>= 1;
	},

	setNameTable: function( index ) {
		this.loopyT = ( this.loopyT & NAMETABLE_RESET ) | ( index << 10 );
	}
};

module.exports = Background;