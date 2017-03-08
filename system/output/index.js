import AudioOutput from './audiooutput';
import VideoOutput from './videooutput';

class Output {
  constructor() {
    this.audio = new AudioOutput();
    this.video = new VideoOutput();
  }
}

export default Output;
