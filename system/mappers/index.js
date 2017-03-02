import NROM from './nrom';
import MMC1 from './mmc1';
import MMC2 from './mmc2';
import MMC3 from './mmc3';
import UxROM from './uxrom';
import AxROM from './axrom';

const mapperList = {};

mapperList[0] = NROM;
mapperList[1] = MMC1;
mapperList[2] = UxROM;
mapperList[4] = MMC3;
mapperList[7] = AxROM;
mapperList[9] = MMC2;

function init(cartridge) {
  const mapperID = cartridge.mapper;

  if (!(mapperID in mapperList)) {
    throw new Error(`Unknown mapper ${mapperID}`);
  }

  let mapper = mapperList[mapperID];
  for (let method in mapper) {
    cartridge[method] = mapper[method];
  }

  cartridge.init();
}

export default {
  init,
};
