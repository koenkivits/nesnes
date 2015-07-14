"use strict";

var bitwise = require("../utils/bitwise");

function Sprites( ppu ) {
	this.ppu = ppu;
	this.memory = ppu.memory;

	this.enabled = true;
	this.enabledLeft = true;

	// OAM
	this.oamAddress = 0;
	this.oam = new Uint8Array( 0x100 );
	this.oam2 = new Uint8Array( 0x21 );
	this.oam2reset = new Uint8Array( this.oam2.length );
	for ( var i = 0; i < this.oam2reset.length; i++ ) {
		this.oam2reset[ i ] = 0xff;
	}

	this.spriteProgress = 0;
	this.currentSprite = 0;

	this.spriteSize = 8;
	this.baseTable = 0;

	this.clearProgress = 0;
	this.n = 0;
	this.m = 0;
	this.oam2Index = 0;
	this.oamInitDone = 0;
	this.sprite0Next = false;
	this.sprite0InRange = false;
	this.spriteOverflow = false;
	this.scanlineOverflow = false;
	this.spriteCount = 0;
	this.nextSpriteCount = 0;

	this.yCounters = new Uint8Array( 0x40 );
	this.yCountersReset = new Uint8Array( this.yCounters.length );
	this.oddPixel = true;

	this.nextScanlineSprite0 = new Uint8Array( 0x100 );
	this.nextScanlinePriority = new Uint8Array( 0x100 );
	this.nextScanlineColors = new Uint8Array( 0x100 );

	this.scanlineSprite0 = new Uint8Array( 0x100 );
	this.scanlinePriority = new Uint8Array( 0x100 );
	this.scanlineColors = new Uint8Array( 0x100 );

	this.scanlineReset = new Uint8Array( this.scanlineColors.length );

	Object.preventExtensions( this );
}

Sprites.prototype = {
	toggle: function( flag ) {
		this.enabled = !!flag;
	},

	toggleLeft: function( flag ) {
		this.enabledLeft = !!flag;
	},

	evaluate: function() {
		var lineCycle = this.ppu.lineCycle;

		if ( lineCycle === 0 ) {
			// this also (just like bg) seems to be an idle cycle
			this.n = 0;
			this.m = 0;
			this.oamInitDone = 0;
			this.currentSprite = 0;
			this.oam2Index = 0;
			this.sprite0InRange = this.sprite0Next;
			this.sprite0Next = false;
			this.scanlineOverflow = false;
			this.oddPixel = true;

			this.oamAddress = 0;

			this.clearSecondaryOAM();

			this.scanlineSprite0.set( this.nextScanlineSprite0 );
			this.scanlinePriority.set( this.nextScanlinePriority );
			this.scanlineColors.set( this.nextScanlineColors );

			if ( this.nextSpriteCount ) {
				this.nextScanlineSprite0.set( this.scanlineReset );
				this.nextScanlinePriority.set( this.scanlineReset );
				this.nextScanlineColors.set( this.scanlineReset );
			}

			this.spriteCount = this.nextSpriteCount;
			this.nextSpriteCount = 0;
		} else if ( lineCycle <= 64 ) {
			// do nothing
		} else if ( lineCycle <= 256 ) {
			this.initSecondaryOAM();
		} else if ( lineCycle <= 320 ) {
			this.fetchSprites();
		}
	},

	readOAM: function() {
		if ( this.ppu.vBlank ) { // TODO
			return this.oam[ this.oamAddress ];

			// TODO increment?
		}

		return 0;
	},

	writeOAM: function( value ) {
		if ( this.ppu.vBlank ) {
			this.oam[ this.oamAddress ] = value;
			this.oamAddress = ( this.oamAddress + 1 ) & 0xff;
		}
	},

	/**
	 * Clear secondary OAM.
	 */
	clearSecondaryOAM: function() {
		this.oam2.set( this.oam2reset );

		if ( this.ppu.scanline === -1 ) {
			this.yCounters.set( this.yCountersReset );
		}
	},


	/**
	 * Initialize secondary OAM ('sprite evaluation').
	 */
	initSecondaryOAM: function() {
		if ( !this.ppu.enabled  ) {
			return;
		}

		if ( this.n === 64 ) {
			this.oam2[ this.oam2Index ] = 0;

			return;
		}

		var index = this.oamAddress,
			value = this.oam[ index ];

		this.oam2[ this.oam2Index ] = value;

		if ( this.ppu.scanline === value ) {
			this.yCounters[ this.n ] = this.spriteSize;
		}

		if ( this.yCounters[ this.n ] ) {
			// sprite is in range

			if ( !this.scanlineOverflow ) {
				// there's still space left in secondary OAM
				this.oam2.set( this.oam.subarray(index, index + 4), this.oam2Index );

				if ( this.n === 0 ) {
					this.sprite0Next = true;
				}

				this.nextSpriteCount++;
				this.oam2Index += 4;

				if ( this.oam2Index === 32 ) {
					this.scanlineOverflow = true;
				}
			} else {
				// secondary OAM is full but sprite is in range. Trigger sprite overflow
				this.spriteOverflow = true;

				// TODO buggy 'm' overflow behavior
			}

			this.yCounters[ this.n ]--;
		}

		this.oamAddress += 4;
		this.n++;
	},

	/**
	 * Fetch sprite data and feed appropriate shifters, counters and latches.
	 */
	fetchSprites: function() {
		if ( this.ppu.enabled && this.spriteProgress === 7 ) {
			var spriteIndex = this.currentSprite << 2,
				y = this.oam2[ spriteIndex ],
				tileIndex = this.oam2[ spriteIndex + 1 ],
				attributes = this.oam2[ spriteIndex + 2 ],
				x = this.oam2[ spriteIndex + 3 ],
				baseTable = this.baseTable,
				tileAddress = 0,
				tileLow = 0,
				tileHigh = 0,
				flipX = attributes & 0x40,
				flipY = 0,
				fineY = 0;

			flipY = attributes & 0x80;
			fineY = ( this.ppu.scanline - y ) & ( this.spriteSize - 1 );
			// (the '& spriteSize' is needed because fineY can overflow due
			// to uninitialized tiles in secondary OAM)

			if ( this.spriteSize === 16 ) {
				// big sprite, select proper nametable and handle flipping
				baseTable = ( tileIndex & 1 ) ? 0x1000 : 0;
				tileIndex = tileIndex & ~1;

				if ( fineY > 7 ) {
					fineY -= 8;
					if ( !flipY ) {
						tileIndex++;
					}
				} else if ( flipY ) {
					tileIndex++;
				}
			}

			if ( flipY ) {
				fineY = 8 - fineY - 1;
			}

			tileAddress = ( tileIndex << 4 ) + baseTable + fineY;

			tileLow = this.memory.read( tileAddress );
			tileHigh = this.memory.read( tileAddress + 8 );

			if ( flipX ) {
				tileLow = bitwise.reverse( tileLow );
				tileHigh = bitwise.reverse( tileHigh );
			}

			if ( this.currentSprite < this.nextSpriteCount ) {
				this.preloadSprite( x, tileLow, tileHigh, attributes );
			}
		}

		this.spriteProgress += 1;
		if ( this.spriteProgress === 8 ) {
			this.spriteProgress = 0;
			this.currentSprite += 1;
		}
	},

	preloadSprite: function( x, tileLow, tileHigh, attributes ) {
		var mask = 0x80,

			palette = 0x10 | ( (attributes & 3) << 2 ),
			priority = attributes & 0x20,
			sprite0 = ( this.currentSprite === 0 ) && this.sprite0Next,

			low = 0,
			high = 0,
			color = 0,
			i = 0;

		for ( ; i < 8; i++ ) {
			if ( !this.nextScanlineColors[ x ] ) {
				low = !!( tileLow & mask );
				high = !!( tileHigh & mask ) << 1;
				color = ( high | low );

				if ( color ) {
					this.nextScanlineColors[ x ] = palette | color;
					this.nextScanlinePriority[ x ] = priority;
					this.nextScanlineSprite0[ x ] = sprite0;
				}
			}

			mask >>= 1;
			x++;
		}
	},

	setPixel: function( backgroundColor ) {
		var x = this.ppu.lineCycle - 1,
			color = this.scanlineColors[ x ];

		if ( 
			!color ||
			!this.enabled ||
			(!this.enabledLeft && this.ppu.inLeft8px) ||
			this.ppu.lineCycle === 256
		) {
			return backgroundColor;
		}

		if ( color && this.scanlineSprite0[ x ] && backgroundColor ) {
			this.ppu.sprite0Hit = true;
		}

		if ( backgroundColor && this.scanlinePriority[ x ] ) {
			// sprite pixel is behind background
			return backgroundColor;
		}

		return color;
	}
};

module.exports = Sprites;