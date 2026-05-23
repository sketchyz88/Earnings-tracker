import { useEffect, useMemo, useRef, useState } from "react";

const ALIGNMENT_HINTS = [
  "Center the golfer inside the guide frame.",
  "Use a tripod and record at 60fps or higher when possible.",
  "Keep the camera still and low behind the ball.",
  "Place the ball inside the strike zone box before the swing.",
];

const PLAYBACK_PRESETS = [0.25, 0.5, 0.75, 1];
const IMPACT_ROI = { x0: 0.28, x1: 0.62, y0: 0.5, y1: 0.88 };

function App() {
  const fileInputRef = useRef(null);
  const liveVideoRef = useRef(null);
  const replayVideoRef = useRef(null);
  const recordPreviewRef = useRef(null);
  const captureCanvasRef = useRef(document.createElement("canvas"));
  const overlayRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceBlob, setSourceBlob] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState("Align the golfer in the frame, then record.");
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [opencvReady, setOpenCvReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [timelineValue, setTimelineValue] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(0.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualTraceMode, setManualTraceMode] = useState(false);
  const [launchAssistMode, setLaunchAssistMode] = useState(false);
  const [seededLaunchPoint, setSeededLaunchPoint] = useState(null);
  const [impactTime, setImpactTime] = useState(null);
  const [tracePoints, setTracePoints] = useState([]);
  const [selectedPointId, setSelectedPointId] = useState(null);

  useEffect(() => {
    startCamera();
    waitForOpenCv();

    return () => {
      stopCamera();
      if (sourceUrl) {
        URL.revokeObjectURL(sourceUrl);
      }
    };
  }, []);

  async function waitForOpenCv() {
    if (!window.cv) {
      window.setTimeout(waitForOpenCv, 250);
      return;
    }

    try {
      const cvLib = window.cv instanceof Promise ? await window.cv : window.cv;
      if (cvLib) {
        setOpenCvReady(true);
      }
    } catch (error) {
      console.error("OpenCV.js failed to load.", error);
    }
  }

  useEffect(() => {
    const video = replayVideoRef.current;

    if (video) {
      video.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
      }

      setCameraReady(true);
      setAnalysisStatus("Camera ready. Align the golfer and press Record.");
    } catch (error) {
      console.error(error);
      setAnalysisStatus("Camera access was denied. You can still upload a swing video.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  function openPicker() {
    fileInputRef.current?.click();
  }

  function cleanupSourceUrl() {
    if (sourceUrl) {
      URL.revokeObjectURL(sourceUrl);
    }
  }

  function resetReplayState(nextUrl, nextName) {
    cleanupSourceUrl();
    setSourceUrl(nextUrl);
    setSourceName(nextName);
    setSourceBlob(null);
    setTimelineValue(0);
    setDuration(0);
    setIsPlaying(false);
    setImpactTime(null);
    setTracePoints([]);
    setSelectedPointId(null);
    setManualMode(false);
    setManualTraceMode(false);
    setLaunchAssistMode(false);
    setSeededLaunchPoint(null);
  }

  async function startRecording() {
    if (!streamRef.current || recording) {
      return;
    }

    const mimeType =
      MediaRecorder.isTypeSupported("video/mp4")
        ? "video/mp4"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";

    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || "video/webm" });
      const nextUrl = URL.createObjectURL(blob);
      resetReplayState(nextUrl, `Recorded Swing ${new Date().toLocaleTimeString()}`);
      setSourceBlob(blob);
      setAnalysisStatus("Instant replay ready. Auto-tracking will start, and you can always switch to manual trace if needed.");
      setRecording(false);
    };

    recorder.start();
    setRecording(true);
    setAnalysisStatus("Recording swing...");
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function handleVideoSelect(event) {
    const [file] = event.target.files || [];

    if (!file) {
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    resetReplayState(nextUrl, file.name);
    setSourceBlob(file);
    setAnalysisStatus("Video imported. Auto-tracking will start, and you can always switch to manual trace if needed.");
    event.target.value = "";
  }

  async function togglePlayback() {
    const video = replayVideoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      try {
        await video.play();
      } catch (error) {
        console.error(error);
      }
      return;
    }

    video.pause();
  }

  function formatTime(value) {
    if (!Number.isFinite(value)) {
      return "0:00";
    }

    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function applyKalmanSmoothing(points) {
    if (!points.length) {
      return [];
    }

    let x = points[0].x;
    let y = points[0].y;
    let vx = 0;
    let vy = 0;
    let covariance = 1;
    const processNoise = 0.04;
    const measurementNoise = 0.18;

    return points.map((point, index) => {
      if (index === 0) {
        return { ...point, sx: point.x, sy: point.y };
      }

      x += vx;
      y += vy;
      covariance += processNoise;

      const gain = covariance / (covariance + measurementNoise);
      x = x + gain * (point.x - x);
      y = y + gain * (point.y - y);
      covariance = (1 - gain) * covariance;

      vx = x - points[index - 1].x;
      vy = y - points[index - 1].y;

      return {
        ...point,
        sx: x,
        sy: y,
      };
    });
  }

  function buildReplayableTrace(points, impactAt, seedPoint) {
    if (!points.length) {
      return [];
    }

    if (points.length >= 3) {
      return points;
    }

    const first = points[0];
    const trace = [...points];
    const launchX = seedPoint?.x ?? clamp(first.x - 5.5, 0, 100);
    const launchY = seedPoint?.y ?? clamp(first.y + 3.8, 0, 100);

    if (points.length === 1) {
      trace.unshift({
        id: crypto.randomUUID(),
        time: Math.max((impactAt ?? first.time) + 0.01, 0),
        x: launchX,
        y: launchY,
        confidence: 0.32,
        predicted: true,
      });

      for (let index = 1; index <= 5; index += 1) {
        trace.push({
          id: crypto.randomUUID(),
          time: first.time + index * 0.035,
          x: clamp(first.x + index * 4.8, 0, 100),
          y: clamp(first.y - index * 3.2 - index * index * 0.12, 0, 100),
          confidence: 0.24,
          predicted: true,
        });
      }

      return trace;
    }

    const second = points[1];
    const vx = second.x - first.x;
    const vy = second.y - first.y;
    trace.unshift({
      id: crypto.randomUUID(),
      time: Math.max((impactAt ?? first.time) + 0.01, 0),
      x: launchX,
      y: launchY,
      confidence: 0.34,
      predicted: true,
    });

    for (let index = 1; index <= 4; index += 1) {
      trace.push({
        id: crypto.randomUUID(),
        time: second.time + index * 0.035,
        x: clamp(second.x + vx * index * 1.08, 0, 100),
        y: clamp(second.y + vy * index * 1.05 - index * index * 0.1, 0, 100),
        confidence: 0.26,
        predicted: true,
      });
    }

    return trace;
  }

  function densifyTracePath(points) {
    if (points.length < 2) {
      return points;
    }

    const dense = [];

    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      dense.push(current);

      for (let step = 1; step <= 3; step += 1) {
        const t = step / 4;
        dense.push({
          ...current,
          id: `${current.id}-interp-${index}-${step}`,
          time: current.time + (next.time - current.time) * t,
          x: current.x + (next.x - current.x) * t,
          y: current.y + (next.y - current.y) * t,
          confidence: Math.min(current.confidence, next.confidence),
          predicted: current.predicted || next.predicted,
        });
      }
    }

    dense.push(points[points.length - 1]);
    return dense;
  }

  async function detectAudioImpactTime(blob, fallbackDuration) {
    if (!blob) {
      return null;
    }

    try {
      const arrayBuffer = await blob.arrayBuffer();
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) {
        return null;
      }

      const audioContext = new AudioContextClass();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      const channel = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const windowSize = Math.max(1024, Math.floor(sampleRate / 120));
      let bestEnergy = 0;
      let bestTime = null;

      for (let index = 0; index < channel.length - windowSize; index += windowSize) {
        let energy = 0;
        for (let offset = 0; offset < windowSize; offset += 1) {
          const sample = channel[index + offset];
          energy += sample * sample;
        }

        const rms = Math.sqrt(energy / windowSize);
        const time = index / sampleRate;

        if (rms > bestEnergy && time > 0.08 && time < fallbackDuration * 0.9) {
          bestEnergy = rms;
          bestTime = time;
        }
      }

      await audioContext.close();
      return bestTime;
    } catch (error) {
      console.error("Audio impact detection unavailable.", error);
      return null;
    }
  }

  function findBrightMovingBall(prevFrame, nextFrame, width, height, expected) {
    const searchRadiusX = expected ? width * 0.2 : width * 0.52;
    const searchRadiusY = expected ? height * 0.24 : height * 0.5;
    const searchCenterX = expected ? expected.x : width * 0.56;
    const searchCenterY = expected ? expected.y : height * 0.52;

    const candidates = [];

    for (let y = 4; y < height - 4; y += 2) {
      if (Math.abs(y - searchCenterY) > searchRadiusY) {
        continue;
      }

      for (let x = 4; x < width - 4; x += 2) {
        if (Math.abs(x - searchCenterX) > searchRadiusX) {
          continue;
        }

        const index = (y * width + x) * 4;
        const r = nextFrame[index];
        const g = nextFrame[index + 1];
        const b = nextFrame[index + 2];

        const brightness = (r + g + b) / 3;
        const whiteness = brightness - Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));

        if (brightness < 135 && whiteness < 120) {
          continue;
        }

        const diff =
          Math.abs(nextFrame[index] - prevFrame[index]) +
          Math.abs(nextFrame[index + 1] - prevFrame[index + 1]) +
          Math.abs(nextFrame[index + 2] - prevFrame[index + 2]);

        if (diff < 70) {
          continue;
        }

        const localIndexLeft = (y * width + (x - 2)) * 4;
        const localIndexRight = (y * width + (x + 2)) * 4;
        const edgeContrast =
          Math.abs(nextFrame[index] - nextFrame[localIndexLeft]) +
          Math.abs(nextFrame[index] - nextFrame[localIndexRight]);

        const continuityPenalty = expected
          ? Math.abs(x - expected.x) * 1.4 + Math.abs(y - expected.y) * 1.15
          : 0;

        const score = brightness * 0.24 + whiteness * 0.26 + diff * 0.4 + edgeContrast * 0.1 - continuityPenalty;

        candidates.push({
          x,
          y,
          score,
          brightness,
          diff,
        });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0] || null;
  }

  function detectImpact(frameDiffSamples) {
    if (!frameDiffSamples.length) {
      return null;
    }

    const maxSample = frameDiffSamples.reduce((best, sample) => (sample.motion > best.motion ? sample : best));
    const averageMotion =
      frameDiffSamples.reduce((sum, sample) => sum + sample.motion, 0) / frameDiffSamples.length;

    if (maxSample.motion < averageMotion * 1.7) {
      return frameDiffSamples[Math.floor(frameDiffSamples.length * 0.35)] || null;
    }

    return maxSample;
  }

  function combineImpactSignals(audioImpactTime, motionImpactTime) {
    if (audioImpactTime == null && motionImpactTime == null) {
      return null;
    }

    if (audioImpactTime == null) {
      return motionImpactTime;
    }

    if (motionImpactTime == null) {
      return audioImpactTime;
    }

    return audioImpactTime * 0.55 + motionImpactTime * 0.45;
  }

  function findBrightMovingBallOpenCv(prevFrame, nextFrame, width, height, expected) {
    const cvLib = window.cv;
    if (!cvLib) {
      return null;
    }

    const prevImage = new ImageData(new Uint8ClampedArray(prevFrame), width, height);
    const nextImage = new ImageData(new Uint8ClampedArray(nextFrame), width, height);

    const prevMat = cvLib.matFromImageData(prevImage);
    const nextMat = cvLib.matFromImageData(nextImage);
    const prevGray = new cvLib.Mat();
    const nextGray = new cvLib.Mat();
    const diff = new cvLib.Mat();
    const thresh = new cvLib.Mat();
    const kernel = cvLib.Mat.ones(3, 3, cvLib.CV_8U);
    const contours = new cvLib.MatVector();
    const hierarchy = new cvLib.Mat();

    try {
      cvLib.cvtColor(prevMat, prevGray, cvLib.COLOR_RGBA2GRAY);
      cvLib.cvtColor(nextMat, nextGray, cvLib.COLOR_RGBA2GRAY);
      cvLib.absdiff(nextGray, prevGray, diff);
      cvLib.threshold(diff, thresh, 28, 255, cvLib.THRESH_BINARY);
      cvLib.morphologyEx(thresh, thresh, cvLib.MORPH_OPEN, kernel);
      cvLib.findContours(thresh, contours, hierarchy, cvLib.RETR_EXTERNAL, cvLib.CHAIN_APPROX_SIMPLE);

      let best = null;

      for (let index = 0; index < contours.size(); index += 1) {
        const contour = contours.get(index);
        const rect = cvLib.boundingRect(contour);
        const area = rect.width * rect.height;

        if (area < 6 || area > 180) {
          contour.delete();
          continue;
        }

        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;

        if (expected) {
          const dx = Math.abs(cx - expected.x);
          const dy = Math.abs(cy - expected.y);
          if (dx > width * 0.28 || dy > height * 0.28) {
            contour.delete();
            continue;
          }
        }

        const pixelIndex = (Math.floor(cy) * width + Math.floor(cx)) * 4;
        const r = nextFrame[pixelIndex];
        const g = nextFrame[pixelIndex + 1];
        const b = nextFrame[pixelIndex + 2];
        const brightness = (r + g + b) / 3;
        const whiteness = brightness - Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
        const continuityPenalty = expected ? Math.abs(cx - expected.x) + Math.abs(cy - expected.y) : 0;
        const score = brightness * 0.24 + whiteness * 0.26 + area * 0.3 - continuityPenalty * 0.6;

        if (!best || score > best.score) {
          best = {
            x: cx,
            y: cy,
            score,
            brightness,
            diff: score,
          };
        }

        contour.delete();
      }

      return best;
    } finally {
      prevMat.delete();
      nextMat.delete();
      prevGray.delete();
      nextGray.delete();
      diff.delete();
      thresh.delete();
      kernel.delete();
      contours.delete();
      hierarchy.delete();
    }
  }

  async function analyzeReplay(options = {}) {
    const video = replayVideoRef.current;
    const canvas = captureCanvasRef.current;

    if (!video || !canvas || !duration) {
      return;
    }

    setAnalysisBusy(true);
    setAnalysisStatus(`Detecting impact and tracking ball flight${opencvReady ? " with OpenCV" : ""}...`);

    const width = 320;
    const height = Math.max(180, Math.round((video.videoHeight / Math.max(video.videoWidth, 1)) * width));
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      setAnalysisBusy(false);
      setAnalysisStatus("Analysis is unavailable in this browser.");
      return;
    }

    const fps = 30;
    const step = 1 / fps;
    const frameDiffSamples = [];
    let previousFrame = null;

    const restoreTime = video.currentTime;
    const restorePaused = video.paused;
    video.pause();

    for (let time = 0; time <= duration; time += step) {
      await seekVideo(video, time);
      context.drawImage(video, 0, 0, width, height);
      const frame = context.getImageData(0, 0, width, height).data;

      if (previousFrame) {
        let motion = 0;
        for (let y = Math.floor(height * IMPACT_ROI.y0); y < Math.floor(height * IMPACT_ROI.y1); y += 2) {
          for (let x = Math.floor(width * IMPACT_ROI.x0); x < Math.floor(width * IMPACT_ROI.x1); x += 2) {
            const index = (y * width + x) * 4;
            motion +=
              Math.abs(frame[index] - previousFrame[index]) +
              Math.abs(frame[index + 1] - previousFrame[index + 1]) +
              Math.abs(frame[index + 2] - previousFrame[index + 2]);
          }
        }

        frameDiffSamples.push({ time, motion });
      }

      previousFrame = new Uint8ClampedArray(frame);
    }

    const impactSample = detectImpact(frameDiffSamples);
    const audioImpactTime = await detectAudioImpactTime(sourceBlob, duration);
    const nextImpactTime = combineImpactSignals(audioImpactTime, impactSample?.time ?? null) ?? duration * 0.35;
    setImpactTime(nextImpactTime);

    const tracked = [];
    previousFrame = null;
    const activeSeed = options.seedPoint || seededLaunchPoint;
    let expected = activeSeed
      ? {
          x: (activeSeed.x / 100) * width,
          y: (activeSeed.y / 100) * height,
        }
      : null;
    let misses = 0;

    for (let time = nextImpactTime; time <= Math.min(duration, nextImpactTime + 2.2); time += step) {
      await seekVideo(video, time);
      context.drawImage(video, 0, 0, width, height);
      const frame = context.getImageData(0, 0, width, height).data;

      if (previousFrame) {
        const candidate =
          (opencvReady ? findBrightMovingBallOpenCv(previousFrame, frame, width, height, expected) : null) ||
          findBrightMovingBall(previousFrame, frame, width, height, expected);

        if (candidate) {
          misses = 0;
          expected = {
            x: candidate.x + 6,
            y: candidate.y - 2,
          };

          tracked.push({
            id: crypto.randomUUID(),
            time,
            x: (candidate.x / width) * 100,
            y: (candidate.y / height) * 100,
            confidence: clamp((candidate.diff || candidate.score || 120) / 260, 0.22, 0.99),
            predicted: false,
          });
        } else if (tracked.length >= 2 && misses < 8) {
          misses += 1;
          const prev = tracked[tracked.length - 1];
          const prev2 = tracked[tracked.length - 2];
          const dx = prev.x - prev2.x;
          const dy = prev.y - prev2.y;
          const estimatedX = prev.x + dx;
          const estimatedY = prev.y + dy - 0.08 * misses;

          tracked.push({
            id: crypto.randomUUID(),
            time,
            x: clamp(estimatedX, 0, 100),
            y: clamp(estimatedY, 0, 100),
            confidence: 0.22,
            predicted: true,
          });

          expected = {
            x: (estimatedX / 100) * width,
            y: (estimatedY / 100) * height,
          };
        } else if (misses >= 8) {
          break;
        }
      }

      previousFrame = new Uint8ClampedArray(frame);
    }

    const smoothed = applyKalmanSmoothing(tracked).map((point) => ({
      ...point,
      x: point.sx,
      y: point.sy,
    }));
    const replayable = applyKalmanSmoothing(
      buildReplayableTrace(smoothed, nextImpactTime, activeSeed || seededLaunchPoint),
    ).map((point) => ({
      ...point,
      x: point.sx,
      y: point.sy,
    }));

    setTracePoints(replayable);
    setAnalysisBusy(false);
    if (replayable.length >= 3) {
      setLaunchAssistMode(false);
      const weakPoints = replayable.filter((point) => point.confidence < 0.35).length;
      setAnalysisStatus(
        `Impact detected at ${formatTime(nextImpactTime)}. Built a replay tracer with ${replayable.length} points${weakPoints ? ` and ${weakPoints} low-confidence points ready for correction` : ""}.`,
      );
    } else {
      setManualMode(true);
      setLaunchAssistMode(true);
      setAnalysisStatus("Auto-track struggled to find the ball. Tap Set Launch Point to retry from a seed, or use Manual Trace to place the tracer yourself.");
    }

    await seekVideo(video, restoreTime);
    if (!restorePaused) {
      video.play().catch(() => {});
    }
  }

  function visibleTracePath(points) {
    if (points.length < 2) {
      return "";
    }

    return points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");
  }

  function handleOverlayClick(event) {
    if ((!manualMode && !launchAssistMode && !manualTraceMode) || !overlayRef.current) {
      return;
    }

    const bounds = overlayRef.current.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    const currentTime = replayVideoRef.current?.currentTime ?? 0;

    if (manualTraceMode) {
      setTracePoints((current) =>
        [...current, { id: crypto.randomUUID(), x, y, time: currentTime, confidence: 1, predicted: false }]
          .sort((a, b) => a.time - b.time),
      );
      setAnalysisStatus("Manual trace point added. Scrub forward and keep tapping along the ball flight.");
      return;
    }

    if (launchAssistMode) {
      const seedPoint = { x, y, time: currentTime };
      setSeededLaunchPoint(seedPoint);
      setLaunchAssistMode(false);
      setManualMode(false);
      setAnalysisStatus("Launch point set. Retrying ball tracking from your selected seed.");
      analyzeReplay({ seedPoint });
      return;
    }

    setTracePoints((current) => {
      const lowConfidence = current.find((point) => point.confidence < 0.35 && Math.abs(point.time - currentTime) < 0.12);

      if (lowConfidence) {
        return current.map((point) =>
          point.id === lowConfidence.id
            ? { ...point, x, y, confidence: 1, predicted: false }
            : point,
        );
      }

      return [...current, { id: crypto.randomUUID(), x, y, time: currentTime, confidence: 1, predicted: false }]
        .sort((a, b) => a.time - b.time);
    });
  }

  async function exportSocialVideo() {
    const video = replayVideoRef.current;
    if (!video) {
      return;
    }

    const canvas = document.createElement("canvas");
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm",
    });
    const chunks = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    const restoreTime = video.currentTime;
    video.pause();
    recorder.start();

    const step = 1 / 30;
    for (let time = 0; time <= duration; time += step) {
      await seekVideo(video, time);
      context.drawImage(video, 0, 0, width, height);

      const visibleForExport = tracePoints.filter((point) => point.time <= time);
      if (visibleForExport.length > 1) {
        context.strokeStyle = "#ff3b30";
        context.shadowColor = "rgba(255, 59, 48, 0.75)";
        context.shadowBlur = Math.max(16, width * 0.01);
        context.lineWidth = Math.max(7, width * 0.005);
        context.lineJoin = "round";
        context.lineCap = "round";
        context.beginPath();
        visibleForExport.forEach((point, index) => {
          const px = (point.x / 100) * width;
          const py = (point.y / 100) * height;
          if (index === 0) {
            context.moveTo(px, py);
          } else {
            context.lineTo(px, py);
          }
        });
        context.stroke();
        context.shadowBlur = 0;
      }

      await waitFrame(12);
    }

    const blob = await new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
      recorder.stop();
    });

    await seekVideo(video, restoreTime);
    if (!blob) {
      return;
    }

    const file = new File([blob], "fairwayiq-social-tracer.webm", { type: blob.type || "video/webm" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: "FairwayIQ tracer replay",
          text: "Golf tracer replay by ifonlyicouldputt",
          files: [file],
        });
        return;
      } catch (error) {
        console.error(error);
      }
    }

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "fairwayiq-social-tracer.webm";
    link.click();
    URL.revokeObjectURL(downloadUrl);
  }

  const visiblePoints = useMemo(
    () => densifyTracePath(tracePoints.filter((point) => point.time <= timelineValue)),
    [tracePoints, timelineValue],
  );

  const lowConfidenceCount = tracePoints.filter((point) => point.confidence < 0.35).length;
  const tracePath = useMemo(() => visibleTracePath(visiblePoints), [visiblePoints]);

  return (
    <main className="app-shell tracer-shell premium-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">FairwayIQ</p>
          <p className="maker-line">by ifonlyicouldputt</p>
          <h1>Real-time style golf tracer replay.</h1>
          <p className="subcopy">
            Align the golfer, record the swing, detect impact automatically, and replay a smooth red tracer that grows with the ball flight.
          </p>
        </div>
      </header>

      <section className="hero-banner premium-hero">
        <div>
          <p className="eyebrow">Capture Flow</p>
          <h2>Align. Record. Trace. Replay.</h2>
          <p>{analysisStatus}</p>
        </div>
        <div className="hero-actions">
          <button className="primary-button record-button" type="button" onClick={recording ? stopRecording : startRecording} disabled={!cameraReady && !recording}>
            {recording ? "Stop Recording" : "Record Swing"}
          </button>
          <button className="secondary-button" type="button" onClick={openPicker}>
            Upload Video
          </button>
          <input ref={fileInputRef} className="sr-only" type="file" accept="video/*" onChange={handleVideoSelect} />
        </div>
      </section>

      <section className="content-grid advanced-layout">
        <section className="panel capture-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Camera Guide</p>
              <h2>Setup frame</h2>
            </div>
            <span className="pill">{cameraReady ? "Live camera" : "Upload fallback"}</span>
          </div>

          <div className="guide-stage">
            <video ref={liveVideoRef} className="guide-video" autoPlay muted playsInline />
            <div className="guide-overlay">
              <div className="guide-box" />
              <div className="guide-ball" />
              <div className="strike-zone-box" />
              <div className="guide-target-line" />
            </div>
          </div>

          <div className="hint-list">
            {ALIGNMENT_HINTS.map((hint) => (
              <div className="feed-card" key={hint}>
                <p>{hint}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel replay-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Instant Replay</p>
              <h2>{sourceName || "Record or upload a swing"}</h2>
            </div>
            <span className="pill">{tracePoints.length} trace points</span>
          </div>

          <div className="video-stage replay-stage">
            {sourceUrl ? (
              <>
                <video
                  ref={replayVideoRef}
                  className="tracer-video"
                  src={sourceUrl}
                  playsInline
                  controls
                  onLoadedMetadata={(event) => {
                    setDuration(event.currentTarget.duration || 0);
                    setTimelineValue(0);
                    event.currentTarget.playbackRate = playbackRate;
                    analyzeReplay();
                  }}
                  onTimeUpdate={(event) => setTimelineValue(event.currentTarget.currentTime)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                <button
                  ref={overlayRef}
                  type="button"
                  className={manualMode || manualTraceMode || launchAssistMode ? "trace-overlay manual" : "trace-overlay"}
                  onClick={handleOverlayClick}
                  aria-label="Trace overlay"
                >
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="trace-svg">
                    {tracePath ? <path d={tracePath} className="trace-line red" /> : null}
                    {visiblePoints.map((point) => (
                      <circle
                        key={point.id}
                        cx={point.x}
                        cy={point.y}
                        r={point.id === selectedPointId ? "2.2" : "1.7"}
                        className={point.confidence < 0.35 ? "trace-point low" : "trace-point red"}
                        onClick={() => setSelectedPointId(point.id)}
                      />
                    ))}
                  </svg>
                </button>
              </>
            ) : (
              <div className="empty-stage">
                <h3>Capture a swing to begin.</h3>
                <p>The replay view will auto-detect impact and progressively draw the tracer.</p>
              </div>
            )}
          </div>

          {sourceUrl ? (
            <div className="stack">
              <div className="transport-row tracer-controls advanced-controls">
                <button className="secondary-button" type="button" onClick={togglePlayback}>
                  {isPlaying ? "Pause Replay" : "Play Replay"}
                </button>
                <button className="secondary-button" type="button" onClick={analyzeReplay} disabled={analysisBusy}>
                  {analysisBusy ? "Tracking..." : "Re-track Ball"}
                </button>
                <button
                  className={launchAssistMode ? "primary-button" : "secondary-button"}
                  type="button"
                  onClick={() => {
                    setLaunchAssistMode((value) => !value);
                    setManualMode(false);
                  }}
                >
                  {launchAssistMode ? "Tap Replay To Seed" : "Set Launch Point"}
                </button>
                <button
                  className={manualTraceMode ? "primary-button" : "secondary-button"}
                  type="button"
                  onClick={() => {
                    setManualTraceMode((value) => !value);
                    setManualMode(false);
                    setLaunchAssistMode(false);
                    setAnalysisStatus(
                      !manualTraceMode
                        ? "Manual Trace is on. Scrub the replay and tap the ball path to build the tracer yourself."
                        : "Manual Trace is off.",
                    );
                  }}
                >
                  {manualTraceMode ? "Manual Trace On" : "Manual Trace"}
                </button>
                <button className={manualMode ? "primary-button" : "secondary-button"} type="button" onClick={() => setManualMode((value) => !value)}>
                  {manualMode ? "Manual Correction On" : "Manual Correction"}
                </button>
                <button className="secondary-button" type="button" onClick={exportSocialVideo} disabled={!tracePoints.length}>
                  Export Social Video
                </button>
              </div>

              <div className="field">
                <div className="range-row">
                  <span>Timeline</span>
                  <span>
                    {formatTime(timelineValue)} / {formatTime(duration)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.01"
                  value={timelineValue}
                  onInput={(event) => {
                    const nextValue = Number(event.target.value);
                    setTimelineValue(nextValue);
                    if (replayVideoRef.current) {
                      replayVideoRef.current.currentTime = nextValue;
                    }
                  }}
                />
              </div>

              <div className="field">
                <div className="range-row">
                  <span>Playback Speed</span>
                  <span>{playbackRate.toFixed(2).replace(/0$/, "").replace(/\.0$/, ".0")}x</span>
                </div>
                <div className="preset-row">
                  {PLAYBACK_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={preset === playbackRate ? "speed-pill active" : "speed-pill"}
                      onClick={() => setPlaybackRate(preset)}
                    >
                      {preset}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <aside className="panel side-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Tracking Intel</p>
              <h2>Analysis</h2>
            </div>
            <span className="pill">{impactTime != null ? `Impact ${formatTime(impactTime)}` : "Waiting"}</span>
          </div>

          <div className="stack compact">
            <article className="feed-card">
              <h3>Impact Detection</h3>
              <p>Combines strike-zone motion with audio spike detection to estimate club-ball impact more quickly.</p>
            </article>
            <article className="feed-card">
              <h3>Ball Tracking</h3>
              <p>
                {opencvReady
                  ? "OpenCV frame differencing is active, searching for a fast bright compact object across replay frames."
                  : "OpenCV.js is still loading, so the app is temporarily using a lighter fallback tracker."}
              </p>
            </article>
            <article className="feed-card">
              <h3>Smoothing</h3>
              <p>Trace coordinates are filtered with a lightweight Kalman-style smoother before replay rendering.</p>
            </article>
            <article className="feed-card">
              <h3>Manual Correction</h3>
              <p>
                {manualTraceMode
                  ? "Scrub frame by frame and tap the ball position to build the tracer manually. This is the most reliable mode right now."
                  : launchAssistMode
                  ? "Tap the replay frame where the ball first appears after impact to seed the tracker."
                  : lowConfidenceCount
                    ? `${lowConfidenceCount} low-confidence points can be corrected by enabling Manual Correction and tapping the replay stage at the current frame.`
                    : "No low-confidence points detected right now."}
              </p>
            </article>
            <article className="feed-card">
              <h3>Social Export</h3>
              <p>Export a glowing tracer replay video for Instagram or TikTok posting directly from your phone.</p>
            </article>
          </div>
        </aside>
      </section>
    </main>
  );
}

function seekVideo(video, time) {
  return new Promise((resolve) => {
    const handleSeeked = () => {
      video.removeEventListener("seeked", handleSeeked);
      resolve();
    };

    video.addEventListener("seeked", handleSeeked, { once: true });
    video.currentTime = Math.min(time, Math.max(video.duration - 0.02, 0));
  });
}

function waitFrame(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default App;
