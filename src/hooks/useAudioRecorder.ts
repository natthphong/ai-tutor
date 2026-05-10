// src/hooks/useAudioRecorder.ts
import { useState, useRef, useCallback } from "react";

export function useAudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const chunks = useRef<Blob[]>([]);
    const timer = useRef<NodeJS.Timeout | null>(null);

    const start = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
            chunks.current = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
            recorder.start(100);
            mediaRecorder.current = recorder;
            setIsRecording(true);
            setDuration(0);
            timer.current = setInterval(() => setDuration((d) => d + 1), 1000);
        } catch {
            throw new Error("Microphone access denied");
        }
    }, []);

    const stop = useCallback((): Promise<Blob> => {
        return new Promise((resolve) => {
            if (!mediaRecorder.current) return resolve(new Blob());
            mediaRecorder.current.onstop = () => {
                const blob = new Blob(chunks.current, { type: "audio/webm" });
                mediaRecorder.current?.stream.getTracks().forEach((t) => t.stop());
                resolve(blob);
            };
            mediaRecorder.current.stop();
            setIsRecording(false);
            if (timer.current) clearInterval(timer.current);
        });
    }, []);

    return { isRecording, duration, start, stop };
}
