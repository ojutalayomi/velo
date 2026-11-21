"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { describeMediaError } from "@/lib/call/callPeer";
import { pickVoiceMime, voiceFileName } from "@/lib/voiceNote";

export const MAX_VOICE_SECONDS = 5 * 60;

/** Records the microphone into a single audio File. */
export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  const release = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
    setSeconds(0);
  }, []);

  /** Resolves with an error message when recording could not start, otherwise null. */
  const start = useCallback(async (): Promise<string | null> => {
    if (recorderRef.current) return null;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return "Voice notes aren't supported in this browser.";
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const mime = pickVoiceMime((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      streamRef.current = stream;
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start(250);
      setRecording(true);
      timerRef.current = setInterval(() => {
        setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
      return null;
    } catch (error) {
      release();
      return describeMediaError(error, "microphone").message;
    }
  }, [release]);

  /** Stops and returns the recording (null if it was empty or too short to matter). */
  const stop = useCallback((): Promise<File | null> => {
    const recorder = recorderRef.current;
    if (!recorder) return Promise.resolve(null);
    const elapsed = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    return new Promise((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || chunksRef.current[0]?.type || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        release();
        resolve(
          blob.size > 0 ? new File([blob], voiceFileName(type, elapsed), { type: blob.type }) : null
        );
      };
      recorder.stop();
    });
  }, [release]);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder) recorder.onstop = null;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    chunksRef.current = [];
    release();
  }, [release]);

  // Leaving the page must not leave the microphone on.
  useEffect(() => cancel, [cancel]);

  return { recording, seconds, start, stop, cancel };
}
