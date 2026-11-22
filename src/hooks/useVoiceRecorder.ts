"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { describeMediaError } from "@/lib/call/callPeer";
import { toMp3 } from "@/lib/audioConvert";
import { pickVoiceMime, voiceFileName } from "@/lib/voiceNote";

export const MAX_VOICE_SECONDS = 5 * 60;

/**
 * Records the microphone into a single audio File. A recording can be paused, listened to
 * (`previewUrl`) and resumed before it is sent.
 */
export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  /** A paused recording, playable from this URL. */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  /** The recording ended and is being converted to MP3. */
  const [processing, setProcessing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Time spent recording is the finished segments plus the one in progress (none while paused).
  const accumulatedMsRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);
  const previewWantedRef = useRef(false);
  const previewUrlRef = useRef<string | null>(null);

  const elapsedMs = useCallback(
    () => accumulatedMsRef.current + (segmentStartRef.current ? Date.now() - segmentStartRef.current : 0),
    []
  );

  const dropPreview = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => setSeconds(Math.floor(elapsedMs() / 1000)), 250);
  }, [elapsedMs, stopTimer]);

  const release = useCallback(() => {
    stopTimer();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    accumulatedMsRef.current = 0;
    segmentStartRef.current = null;
    previewWantedRef.current = false;
    dropPreview();
    setRecording(false);
    setPaused(false);
    setSeconds(0);
  }, [dropPreview, stopTimer]);

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
        // Asked for by pause(): the data so far is now complete enough to play back.
        if (previewWantedRef.current) {
          previewWantedRef.current = false;
          const type = recorder.mimeType || chunksRef.current[0]?.type || "audio/webm";
          const url = URL.createObjectURL(new Blob(chunksRef.current, { type }));
          if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = url;
          setPreviewUrl(url);
        }
      };
      streamRef.current = stream;
      recorderRef.current = recorder;
      accumulatedMsRef.current = 0;
      segmentStartRef.current = Date.now();
      recorder.start(250);
      setRecording(true);
      setPaused(false);
      startTimer();
      return null;
    } catch (error) {
      release();
      return describeMediaError(error, "microphone").message;
    }
  }, [release, startTimer]);

  const pause = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    accumulatedMsRef.current = elapsedMs();
    segmentStartRef.current = null;
    stopTimer();
    setSeconds(Math.floor(accumulatedMsRef.current / 1000));
    previewWantedRef.current = true;
    recorder.pause();
    recorder.requestData(); // flushes what was recorded so it can be played back
    setPaused(true);
  }, [elapsedMs, stopTimer]);

  const resume = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "paused") return;
    dropPreview();
    segmentStartRef.current = Date.now();
    recorder.resume();
    setPaused(false);
    startTimer();
  }, [dropPreview, startTimer]);

  /** Stops and returns the recording (null if it was empty). */
  const stop = useCallback((): Promise<File | null> => {
    const recorder = recorderRef.current;
    if (!recorder) return Promise.resolve(null);
    const elapsed = Math.max(1, Math.round(elapsedMs() / 1000));
    return new Promise((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || chunksRef.current[0]?.type || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        release();
        if (blob.size === 0) {
          resolve(null);
          return;
        }
        setProcessing(true);
        const raw = new File([blob], voiceFileName(type, elapsed), { type: blob.type });
        void toMp3(raw, elapsed)
          .then(resolve)
          .finally(() => setProcessing(false));
      };
      recorder.stop();
    });
  }, [elapsedMs, release]);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder) recorder.onstop = null;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    chunksRef.current = [];
    release();
  }, [release]);

  // Leaving the page must not leave the microphone on.
  useEffect(() => cancel, [cancel]);

  return { recording, paused, processing, seconds, previewUrl, start, pause, resume, stop, cancel };
}
