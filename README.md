# NESNES

NESNES (New EcmaScript NES) is a pure JS NES emulator. Try the [demo](http://koen.kivits.com/nesnes)!

[![NESNES screenshot](http://koen.kivits.com/nesnes/screenshot.png)](http://koen.kivits.com/nesnes)

## Installation

NESNES can be installed through npm:

```
npm install nesnes
```

## Getting started

NESNES can be used as follows:

```js
var NesNes = require("nesnes");

var emulator = new NesNes( canvas );
emulator.load( pathToRom, callback );
```

These are the parameters being used:
   * ``canvas``: a &lt;canvas&gt; DOM object to which the video output will be rendered. Not required (though nothing will be rendered if no canvas is given).
   * ``pathToRom``: the path to an INES rom file (most ROMs found on the internet are in this format)
   * ``callback``: function to be executed once the ROM has been loaded and initialized. If ``true`` is passed instead of a function the ROM will automatically start playing once it has been loaded.

## Build standalone

If you're running NESNES in the browser and don't want to use Browserify for your page, you can build a standalone version:

```
npm install
make
```

This will create ``nesnes.js`` in ``dist/``, which exposes a global NesNes object when included in your web page. Note that this file also comes packaged with the npm module.

## Configuration

Default configuration (keyboard and gamepad input) can be found in ``config.json``. Input can also be configured programmatically:

```js
// configure the first player controller to use the gamepad
emulator.input.configure(0, "gamepad", {
	"buttons": {
		"0": "b",
		"1": "a",
		"8": "select",
		"9": "start"
	},
	"axes": {
		"0": "horizontal", // map axis 0 to left/right
		"1": "vertical", // map axis 1 to up/down
	}
})
```

See ``config.json`` for an example configuration.

Note that multiple input types can be enabled for a single controller. For example, a single controller can listen to both the keyboard and a gamepad.

## Testing

NESNES includes a basic test server. You can run it by executing:

```
bin/nesnes-server
```

from a directory containing NES ROMs. This starts up an HTTP server at localhost, serving only a simple page containing a NESNES instance and a ROM selection input to be able to test games. NESNES is recompiled on every page load to make it easy to see how your changes affect the emulator.

A lot of third party test ROMs are included in the ``test`` directory to debug specific parts of the emulator.

## My game doesn't work!

Please file an issue or send a pull request. :)
