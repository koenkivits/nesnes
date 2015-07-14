var NROM = require("./nrom"),
	MMC1 = require("./mmc1"),
	MMC2 = require("./mmc2"),
	MMC3 = require("./mmc3"),
	UxROM = require("./uxrom"),
	AxROM = require("./axrom");

var mapperList = {};

mapperList[ 0 ] = NROM;
mapperList[ 1 ] = MMC1;
mapperList[ 2 ] = UxROM;
mapperList[ 4 ] = MMC3;
mapperList[ 7 ] = AxROM;
mapperList[ 9 ] = MMC2;

exports.init = function( cartridge ) {
	var mapper, method,
		mapperID = cartridge.mapper;

	if ( !( mapperID in mapperList ) ) {
		throw new Error( "Unknown mapper " + mapperID );
	}

	mapper = mapperList[ mapperID ];
	for ( method in mapper ) {
		cartridge[ method ] = mapper[ method ];
	}

	cartridge.init();
};