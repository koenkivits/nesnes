var i,
	reverseLookup = new Uint8Array(0x100);

for ( i = 0; i < 0x100; i++ ) {
	reverseLookup[ i ] = calcReverse( i );
}

function calcReverse( original ) {
	var i,
		reverse = 0;

	for ( i = 7; i >= 0; i-- ) {
		reverse |= ( ( original & 1 ) << i );
		original >>>= 1;
	}

	return reverse;
}

exports.reverse = function( byte ) {
	return reverseLookup[ byte ];
};