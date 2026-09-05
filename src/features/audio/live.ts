import { post } from "@/lib/api";
type Event = {
  ready?: boolean;
  seconds_remaining?: number;
  error?: string;
  ended?: string;
  reconnect?: boolean;
  serverContent?: {
    interrupted?: boolean;
    turnComplete?: boolean;
    inputTranscription?: { text: string };
    outputTranscription?: { text: string };
    modelTurn?: {
      parts: { inlineData?: { data: string; mimeType: string } }[];
    };
  };
};
export class LiveVoice {
  private socket?: WebSocket;
  private stream?: MediaStream;
  private context?: AudioContext;
  private worklet?: AudioWorkletNode;
  private sources = new Set<AudioBufferSourceNode>();
  private nextTime = 0;
  private ping?: ReturnType<typeof setInterval>;
  private stopped = false;
  private ready = false;
  constructor(
    private onEvent: (event: Event) => void,
    private onClose: () => void,
  ) {}
  async start(sessionId: string) {
    this.stopped = false;
    this.context = new AudioContext();
    await this.context.resume();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if(this.stopped){this.stop();return;}
      await this.context.audioWorklet.addModule("/pcm-worklet.js");
      const ticket = await post<{ url: string }>(
        `/sessions/${sessionId}/live-ticket`,
        {},
      );
      if (this.stopped) {
        this.stop();
        return;
      }
      this.socket = new WebSocket(ticket.url);
      this.socket.binaryType = "arraybuffer";
      this.socket.onmessage = (message) => {
        const event: Event = JSON.parse(message.data);
        if (event.ready) this.ready = true;
        const content = event.serverContent;
        if (content?.interrupted) this.clearAudio();
        for (const p of content?.modelTurn?.parts || []) {
          if (p.inlineData) this.playPCM(p.inlineData.data);
        }
        this.onEvent(event);
        if (event.error || event.ended || event.reconnect) this.stop();
      };
      this.socket.onerror = () => {
        this.onEvent({ error: "Live เชื่อมต่อไม่ได้ ลองพูดทีละเทิร์นต่อได้" });
        this.stop();
      };
      this.socket.onclose = () => {
        this.stop();
        this.onClose();
      };
      const source = this.context.createMediaStreamSource(this.stream);
      this.worklet = new AudioWorkletNode(this.context, "pcm-recorder");
      this.worklet.port.onmessage = (e) => {
        if (this.ready && this.socket?.readyState === WebSocket.OPEN) {
          if (this.socket.bufferedAmount > 128000) {
            this.onEvent({
              error: "เครือข่ายส่งเสียงไม่ทัน พักแล้วลองอีกครั้ง",
            });
            this.stop();
            return;
          }
          this.socket.send(e.data);
        }
      };
      source.connect(this.worklet);
      const mute = this.context.createGain();
      mute.gain.value = 0;
      this.worklet.connect(mute);
      mute.connect(this.context.destination);
      this.ping = setInterval(() => {
        if (this.socket?.readyState === WebSocket.OPEN)
          this.socket.send(JSON.stringify({ type: "ping" }));
      }, 15000);
    } catch (e) {
      this.stop();
      throw e;
    }
  }
  private playPCM(encoded: string) {
    if (!this.context) return;
    const raw = atob(encoded);
    const data = new DataView(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i++) data.setUint8(i, raw.charCodeAt(i));
    const buffer = this.context.createBuffer(
      1,
      Math.floor(raw.length / 2),
      24000,
    );
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++)
      channel[i] = data.getInt16(i * 2, true) / 32768;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    this.nextTime = Math.max(this.context.currentTime + 0.03, this.nextTime);
    source.start(this.nextTime);
    this.nextTime += buffer.duration;
    this.sources.add(source);
    source.onended = () => this.sources.delete(source);
  }
  mute(value: boolean) {
    this.stream?.getAudioTracks().forEach((t) => {
      t.enabled = !value;
    });
  }
  private clearAudio() {
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {}
    }
    this.sources.clear();
    this.nextTime = 0;
  }
  stop() {
    const wasStopped = this.stopped;
    this.stopped = true;
    this.ready = false;
    clearInterval(this.ping);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.worklet?.disconnect();
    this.clearAudio();
    if (this.socket?.readyState === WebSocket.OPEN)
      this.socket.send(JSON.stringify({ type: "stop" }));
    this.socket?.close();
    if(this.context?.state !== "closed") void this.context?.close().catch(() => {});
    if(!wasStopped) this.onClose();
  }
}
