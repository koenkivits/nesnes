function AudioOutput() {
	this.bufferIndex = 0;
	this.bufferLength = 8192;
	this.sampleRate = 44100; // will be overwritten by AudioContext sample rate
	this.volume = 1.0;

	this.playing = null;

	this.setEnabled( true );
}

AudioOutput.prototype = {
	/**
	 * Write sample to buffer.
	 */
	writeSample: function( sample ) {
		this.bufferData[ this.bufferIndex++ ] = sample;

		if ( this.bufferIndex === this.bufferLength ) {
			this.bufferIndex = 0;

			if ( this.playing ) {
				this.playing.stop();
			}
			
			this.bufferSource.buffer = this.buffer;
			this.playing = this.bufferSource;
			this.playing.start( 0 );

			this.initBuffer();
		}
	},

	/**
	 * Enable or disable audio output.
	 * Note: only actually enabled if audio is supported.
	 * @param {boolean} enabled - Sets whether enabled or not.
	 */
	setEnabled: function( enabled ) {
		this.enabled = enabled && this.isSupported();

		if ( this.enabled ) {
			this.initHardware();
		}
	},

	/**
	 * Set volume of audio output.
	 * @param {number} value - The volume, ranging from 0.0 to 1.0 (inclusive).
	 */
	setVolume: function( value ) {
		this.gainNode.gain.value = value;
		this.volume = value;
	},

	/**
	 * Initialize hardware output.
	 * Does nothing if audio context is already initialized.
	 */
	initHardware: function() {
		// make sure we don't create too many AudioContexts, because this will throw
		// an error
		if ( this.context ) {
			return;
		}

		this.initContext();
		this.initBuffer();
	},

	/**
	 * Initialize audio context.
	 */
	initContext: function() {
		this.context = new AudioContext();
		this.sampleRate = this.context.sampleRate;
		this.gainNode = this.context.createGain();
		this.gainNode.connect( this.context.destination );
	},

	/**
	 * Initialize audio buffer.
	 */
	initBuffer: function() {
		this.buffer = this.context.createBuffer(1, this.bufferLength, this.context.sampleRate);
		this.bufferData = this.buffer.getChannelData( 0 );

		this.bufferSource = this.context.createBufferSource();
		this.bufferSource.connect( this.gainNode );
	},

	/**
	 * Check if audio output is supported.
	 */
	isSupported: function() {
		return ( typeof AudioContext !== "undefined" );
	}
};

module.exports = AudioOutput;
