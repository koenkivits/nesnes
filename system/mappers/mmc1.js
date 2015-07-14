// map MMC1 mirroring modes to INES mirroring values
var mirrorMap = [ 3, 4, 1, 0 ];

module.exports = {
	init: function() {
		this.lastPRG = this.prgBanks - 1;
		this.prgBank = 0;

		this.chrBank0 = 0;
		this.chrBank1 = 1;

		this.registerWrites = 0;
		this.registerShift = 0;

		this.mapperControl( 0xc );
	},

	mapperControl: function( value ) {
		var mirroring = value & 0x3,
			prgMode = ( value & 0xc ) >> 2,
			chrMode = ( value & 0x10 ) >> 4;

		this.mapperFlags = value;

		this.mirroring = mirrorMap[ mirroring ];
		this.prgMode = prgMode;
		this.chrMode = chrMode;

		this.setPRGBanks();
	},

	setRegister: function( address, value ) {
		switch( address & 0x6000 ) {
		case 0x0000:
			this.mapperControl( value );
			break;
		case 0x2000:
			this.chrBank0 = value;
			this.setChrBanks();

			break;
		case 0x4000:
			this.chrBank1 = value;
			this.setChrBanks();

			break;
		case 0x6000:
			// TODO -- enable/disable RAM on bit 5
			value &= 0xf;

			this.prgBank = value;
			this.setPRGBanks();

			break;
		}

		this.registerWrites = 0;
		this.registerShift = 0;
	},

	setPRGBanks: function() {
		var bank0, bank1;

		switch( this.prgMode ) {
		case 0:	
		case 1:
			bank0 = this.prgBank & ~1;
			bank1 = this.prgBank + 1;
			break;
		case 2:
			bank0 = 0;
			bank1 = this.prgBank;
			break;
		case 3:
			bank0 = this.prgBank;
			bank1 = this.lastPRG;
			break;
		}

		this.loadPRGBank( 0x8000, bank0, 0x4000 );
		this.loadPRGBank( 0xc000, bank1, 0x4000 );
	},

	setChrBanks: function() {
		var bank0, bank1;

		if ( !this.chrMode ) {
			bank0 = this.chrBank0 & ~1;
			bank1 = bank0 + 1;
		} else {
			bank0 = this.chrBank0;
			bank1 = this.chrBank1;

			if ( this.chrBanks < 2 ) {
				bank0 &= 1;
				bank1 &= 1;
			}
		}

		this.loadCHRBank( 0, bank0, 0x1000 );
		this.loadCHRBank( 0x1000, bank1, 0x1000 );
	},

	writeRegister: function( address, value ) {
		// TODO ignore consecutive writes
		if ( value & 0x80 ) {
			// reset mapper register

			this.registerShift = 0;
			this.registerWrites = 0;
			this.mapperControl( this.mapperFlags | 0xc );
		} else {
			// write to register

			this.registerShift = ( this.registerShift >> 1 ) | (( value & 1 ) << 4);
			this.registerWrites++;

			if ( this.registerWrites === 5 ) {
				this.setRegister( address, this.registerShift );
			}
		}
	}
};