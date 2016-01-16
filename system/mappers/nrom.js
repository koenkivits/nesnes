module.exports = {
	init: function() {
		var nrom128 = ( this.prgBanks === 1 );

		if ( nrom128 ) {
			this.loadPRGBank( 0x8000, 0, 0x4000 );
			this.loadPRGBank( 0xc000, 0, 0x4000 );
		} else {
			this.loadPRGBank( 0x8000, 0, 0x8000 );
		}
	},

	readCHR: function( address ) {
		return this.chrData[ address ]; 
	},

	writeCHR: function( address, value ) {
		if ( !this.chrBanks ) {
			// TODO, probably not doing this right for all ROMs (eg, ROMs that have both CHR ROM *and* CHR RAM)
			this.chrData[ address ] = value;
		}

		return value;
	}
};