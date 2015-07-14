var AudioOutput = require("./audiooutput");
var VideoOutput = require("./videooutput");

function Output() {
	this.audio = new AudioOutput();
	this.video = new VideoOutput();
}

module.exports = Output;