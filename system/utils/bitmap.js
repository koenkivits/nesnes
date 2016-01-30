var colors = initColors();
var reversedBytes = initReversedBytes();
var reversedTiles = initReversedTiles();

/**
 * Get the colors of a tile.
 * Note that a 'tile' is a 16 bit word, with the low colors as the first 8 bits and the high
 * colors as the last 8 bits.
 */
exports.getColors = function( tile ) {
	var offset = tile << 8;
	return colors.subarray( offset, offset + 8 );
};

exports.reverseByte = reverseByte;

/**
 * Reverse all the pixels in a tile.
 * Note that a 'tile' is a 16 bit word, with the low colors as the first 8 bits and the high
 * colors as the last 8 bits.
 */
exports.reverseTile = function( tile ) {
	return reversedTiles[ tile ];
};

/**
 * Reverse all the bits in a byte.
 */
function reverseByte( byte ) {
	return reversedBytes[ byte ];
}

/**
 * Initialize lookup table for getColors().
 */
function initColors() {
	var low, high,
	    result = new Uint8Array( 0x1000000 );

	for ( low = 0; low < 0x100; low++ ) {
		for ( high = 0; high < 0x100; high++ ) {
			addTile( low, high );
		}
	}

	return result;

	function addTile( low, high ) {
		var colorLow, colorHigh, color,
		    offset = ( low << 16 ) | ( high << 8 );

		for ( var i = 0; i < 8; i++ ) {
			colorLow = ( low & 1 );
	    	colorHigh = ( high & 1 ) << 1;
	    	color = ( colorHigh | colorLow );

			result[ offset + i ] = color;

			low >>= 1;
	    	high >>= 1;
		}
	}
}

/**
 * Initialize lookup table for reverseTile().
 */
function initReversedTiles() {
	var low, high, tile, reversed,
		result = new Uint16Array( 0x10000 );
		
	for ( low = 0; low < 0x100; low++ ) {
		for ( high = 0; high < 0x100; high++ ) {
			tile = ( low << 8 ) | high;
			reversed = ( reverseByte( low ) << 8 ) | reverseByte( high );
			result[ tile ] = reversed;
		}
	}

	return result;
}

/**
 * Initialize lookup table for reverseByte().
 */
function initReversedBytes() {
	var i,
	    result = new Uint8Array( 0x100 );

	for ( i = 0; i < 0x100; i++ ) {
		result[ i ] = calcReverse( i );
	}

	return result;

	function calcReverse( original ) {
		var i,
			reverse = 0;

		for ( i = 7; i >= 0; i-- ) {
			reverse |= ( ( original & 1 ) << i );
			original >>>= 1;
		}

		return reverse;
	}
}