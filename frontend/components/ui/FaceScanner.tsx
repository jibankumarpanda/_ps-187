import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, ScanFace, CheckCircle2, AlertCircle, ShieldCheck, UserPlus } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { verifyFace } from '@/lib/api';

interface FaceScannerProps {
  onVerificationComplete: (success: boolean, result?: { status: 'enrolled' | 'verified'; message: string }) => void;
  accessToken?: string;
}

type ScanState =
  | 'loading_models'
  | 'initializing'
  | 'scanning'
  | 'capturing'
  | 'verifying'
  | 'success'
  | 'enrolled'
  | 'error';

export function FaceScanner({ onVerificationComplete, accessToken }: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  const [scanState, setScanState] = useState<ScanState>('loading_models');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [resultData, setResultData] = useState<{ status: 'enrolled' | 'verified'; message: string; distance?: number } | null>(null);

  // Refs for mutable state inside animation loops
  const scanStateRef = useRef<ScanState>(scanState);

  // Keep ref in sync
  useEffect(() => {
    scanStateRef.current = scanState;
  }, [scanState]);

  // --- Load face-api.js models ---
  useEffect(() => {
    let cancelled = false;
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        if (!cancelled) {
          setModelsLoaded(true);
          setScanState('initializing');
        }
      } catch (err) {
        console.error('Failed to load face-api.js models:', err);
        if (!cancelled) {
          setScanState('error');
          setErrorMsg('Failed to load face recognition models. Please refresh the page.');
        }
      }
    };
    loadModels();
    return () => { cancelled = true; };
  }, []);

  // --- Start camera once models are loaded ---
  useEffect(() => {
    if (!modelsLoaded) return;
    let active = true;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 480, height: 480 },
        });
        if (!active) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = mediaStream;
        setScanState('scanning');
      } catch (err) {
        console.error('Camera error:', err);
        setScanState('error');
        setErrorMsg('Camera access denied or unavailable. Please ensure permissions are granted.');
      }
    };

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [modelsLoaded]);

  // --- Face detection & auto-approve loop ---
  const runDetectionLoop = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended) {
      animFrameRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    const currentState = scanStateRef.current;
    if (currentState !== 'scanning') {
      return; // Stop loop if we moved past this state
    }

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        // Face found — auto approve and capture immediately
        if (currentState === 'scanning') {
          setScanState('capturing');
          scanStateRef.current = 'capturing';

          // Small delay for UI feedback, then extract final descriptor
          setTimeout(async () => {
            try {
              // Run one more high-quality detection for the final descriptor
              const finalDetection = await faceapi
                .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

              if (!finalDetection) {
                setScanState('error');
                setErrorMsg('Lost face during capture. Please try again.');
                return;
              }

              const descriptor = Array.from(finalDetection.descriptor);
              setScanState('verifying');
              scanStateRef.current = 'verifying';

              // Send descriptor to backend
              const result = await verifyFace(descriptor, accessToken);
              setResultData(result);

              if (result.status === 'enrolled') {
                setScanState('enrolled');
                scanStateRef.current = 'enrolled';
              } else {
                setScanState('success');
                scanStateRef.current = 'success';
              }

              // Notify parent after brief display
              setTimeout(() => {
                onVerificationComplete(true, result);
              }, 1500);
            } catch (err: any) {
              console.error('Face verification error:', err);
              setScanState('error');
              setErrorMsg(err.message || 'Face verification failed.');
            }
          }, 500);

          return; // Stop the loop
        }
      }
    } catch (err) {
      console.error('Detection error:', err);
    }

    // Continue loop
    animFrameRef.current = requestAnimationFrame(runDetectionLoop);
  }, [accessToken, onVerificationComplete]);

  // Start detection loop when scanning begins
  useEffect(() => {
    if (scanState === 'scanning') {
      animFrameRef.current = requestAnimationFrame(runDetectionLoop);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [scanState, runDetectionLoop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full space-y-4">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scanLine {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        .animate-scan-line {
          animation: scanLine 2s ease-in-out infinite;
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(55,185,255,0.4); }
          50% { box-shadow: 0 0 20px 4px rgba(55,185,255,0.2); }
        }
        .animate-pulse-glow {
          animation: pulseGlow 2s ease-in-out infinite;
        }
      `}} />
      <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-full overflow-hidden border-4 border-border bg-[#0F151C] shadow-inner flex items-center justify-center">
        {/* Loading models state */}
        {scanState === 'loading_models' && (
          <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
            <div className="w-8 h-8 border-2 border-[#37B9FF] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold">Loading AI Models...</span>
          </div>
        )}

        {/* Initializing camera */}
        {scanState === 'initializing' && (
          <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
            <Camera className="w-8 h-8 animate-pulse" />
            <span className="text-xs font-semibold">Initializing Camera...</span>
          </div>
        )}

        {/* Error state */}
        {scanState === 'error' && (
          <div className="flex flex-col items-center justify-center text-red-500 space-y-2 p-4 text-center">
            <AlertCircle className="w-8 h-8" />
            <span className="text-xs font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Active camera states */}
        {['scanning', 'capturing', 'verifying', 'success', 'enrolled'].includes(scanState) && (
          <>
            <video
              ref={(el) => {
                videoRef.current = el;
                if (el && streamRef.current && el.srcObject !== streamRef.current) {
                  el.srcObject = streamRef.current;
                }
              }}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-500 ${
                scanState === 'success' || scanState === 'enrolled' ? 'opacity-40' : 'opacity-100'
              }`}
            />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

            {/* Scanning overlay */}
            {scanState === 'scanning' && (
              <>
                <div className="absolute inset-0 border-4 border-[#37B9FF] rounded-full animate-pulse" />
                <div className="absolute top-0 left-0 w-full h-[2px] bg-accent shadow-[0_0_8px_2px_rgba(55,185,255,0.8)] animate-scan-line" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[80%] h-[80%] border border-dashed border-[#37B9FF]/50 rounded-full" />
                </div>
              </>
            )}

            {/* Capturing overlay */}
            {scanState === 'capturing' && (
              <div className="absolute inset-0 border-4 border-[#39D98A] rounded-full animate-pulse" />
            )}

            {/* Verifying overlay */}
            {scanState === 'verifying' && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/40 backdrop-blur-sm z-10">
                <div className="w-10 h-10 border-3 border-[#37B9FF] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Success overlay */}
            {scanState === 'success' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm z-10 animate-fade-in">
                <ShieldCheck className="w-16 h-16 text-green-500 mb-2" />
                <span className="text-sm font-bold text-foreground">Identity Verified</span>
              </div>
            )}

            {/* Enrolled overlay */}
            {scanState === 'enrolled' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm z-10 animate-fade-in">
                <UserPlus className="w-16 h-16 text-accent mb-2" />
                <span className="text-sm font-bold text-foreground">Face Enrolled</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Status text */}
      <div className="text-center h-12">
        {scanState === 'loading_models' && (
          <div className="flex flex-col items-center animate-fade-in">
            <p className="text-xs font-semibold text-muted-foreground">Loading face recognition AI models...</p>
          </div>
        )}
        {scanState === 'scanning' && (
          <div className="flex flex-col items-center animate-fade-in">
            <ScanFace className="w-5 h-5 text-accent mb-1 animate-bounce" />
            <p className="text-xs font-semibold text-muted-foreground">Detecting face... Please look straight</p>
          </div>
        )}
        {scanState === 'capturing' && (
          <div className="flex flex-col items-center animate-fade-in">
            <Camera className="w-5 h-5 text-green-500 mb-1" />
            <p className="text-xs font-semibold text-muted-foreground">Capturing face data...</p>
          </div>
        )}
        {scanState === 'verifying' && (
          <div className="flex flex-col items-center animate-fade-in">
            <div className="w-5 h-5 border-2 border-[#37B9FF] border-t-transparent rounded-full animate-spin mb-1" />
            <p className="text-xs font-semibold text-muted-foreground">Verifying identity (1:1)...</p>
          </div>
        )}
        {scanState === 'success' && (
          <div className="flex flex-col items-center animate-fade-in">
            <p className="text-xs font-bold text-green-500">Identity Verified</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {resultData?.distance !== undefined
                ? `Match confidence: ${((1 - resultData.distance / 0.6) * 100).toFixed(0)}%`
                : 'Authorized for access.'}
            </p>
          </div>
        )}
        {scanState === 'enrolled' && (
          <div className="flex flex-col items-center animate-fade-in">
            <p className="text-xs font-bold text-accent">Face Enrolled Successfully</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Your face will be used for future verifications.</p>
          </div>
        )}
      </div>
    </div>
  );
}
