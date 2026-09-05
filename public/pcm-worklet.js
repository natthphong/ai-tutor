class PCMRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.phase = 0;
    this.sum = 0;
    this.count = 0;
    this.buffer = new Int16Array(1600);
    this.index = 0;
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (input) {
      for (let i = 0; i < input.length; i++) {
        this.sum += input[i];
        this.count++;
        this.phase += 16000 / sampleRate;
        if (this.phase >= 1) {
          const sample = Math.max(-1, Math.min(1, this.sum / this.count));
          this.buffer[this.index++] =
            sample < 0 ? sample * 32768 : sample * 32767;
          this.phase -= 1;
          this.sum = 0;
          this.count = 0;
          if (this.index === this.buffer.length) {
            this.port.postMessage(this.buffer.buffer, [this.buffer.buffer]);
            this.buffer = new Int16Array(1600);
            this.index = 0;
          }
        }
      }
    }
    return true;
  }
}
registerProcessor("pcm-recorder", PCMRecorder);
