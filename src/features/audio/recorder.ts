export class VoiceRecorder {
  private recorder?: MediaRecorder;
  private stream?: MediaStream;
  private chunks: Blob[] = [];
  private timer?: ReturnType<typeof setTimeout>;
  private started = 0;
  private generation=0;
  async start(onLimit?: () => void) {
    if (!navigator.mediaDevices?.getUserMedia)
      throw new Error("ไมโครโฟนต้องใช้ผ่าน HTTPS");
    const generation=++this.generation;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());throw new Error("พักการอัดเสียงแล้ว");}
    this.stream=stream;
    const mime = [
      "audio/webm;codecs=opus",
      "audio/mp4",
      "audio/webm",
      "audio/ogg;codecs=opus",
    ].find((v) => MediaRecorder.isTypeSupported(v));
    try {
      this.recorder = new MediaRecorder(
        this.stream,
        mime ? { mimeType: mime } : undefined,
      );
      this.chunks = [];
      this.recorder.ondataavailable = (e) => {
        if (e.data.size) this.chunks.push(e.data);
      };
      this.recorder.start(200);
      this.started = Date.now();
      this.timer = setTimeout(() => onLimit?.(), 119000);
    } catch (e) {
      this.cleanup();
      throw e;
    }
  }
  stop(): Promise<Blob> {
    clearTimeout(this.timer);
    return new Promise((resolve, reject) => {
      const r = this.recorder;
      if (!r || r.state === "inactive") {
        this.cleanup();
        reject(new Error("ไม่มีเสียงที่กำลังอัด"));
        return;
      }
      r.onstop = () => {
        const blob = new Blob(this.chunks, { type: r.mimeType });
        this.cleanup();
        resolve(blob);
      };
      r.onerror = () => {
        this.cleanup();
        reject(new Error("การอัดเสียงขัดข้อง"));
      };
      r.stop();
    });
  }
  cancel() {
    this.generation++;
    clearTimeout(this.timer);
    if (this.recorder?.state === "recording") this.recorder.stop();
    this.cleanup();
  }
  private cleanup() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
  }
  get seconds() {
    return Math.round((Date.now() - this.started) / 1000);
  }
}
