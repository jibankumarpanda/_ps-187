"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Shield, Eye, EyeOff, Lock, User, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { FaceScanner } from '@/components/ui/FaceScanner';
import { login as apiLogin } from '@/lib/api';

type LoginStep = 'CREDENTIALS' | 'FACE_VERIFICATION';

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  
  const [step, setStep] = useState<LoginStep>('CREDENTIALS');
  const [username, setUsername] = useState('operator12@ibvap.gov');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string>('');

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError('Please provide valid credentials.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await apiLogin(username, password);
      setAccessToken(result.accessToken);
      setIsLoading(false);
      setStep('FACE_VERIFICATION');
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Connection to server failed.');
    }
  };

  const handleFaceVerificationComplete = (success: boolean, result?: { status: 'enrolled' | 'verified'; message: string }) => {
    if (success) {
      const isEnrollment = result?.status === 'enrolled';
      showToast({
        title: isEnrollment ? 'Face Enrolled & Authenticated' : 'Authentication Successful',
        message: isEnrollment
          ? 'Your face has been registered for future logins. Welcome!'
          : 'Welcome to IBVAP Command & Control Center.',
        type: 'success',
      });
      router.push('/dashboard');
    } else {
      setError('Face verification failed. Please try again.');
      setStep('CREDENTIALS');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070B0F] flex flex-col lg:flex-row font-sans text-foreground select-none overflow-x-hidden">
      
      {/* ─── SIDE 1: FULL IMAGE PANEL (ENTIRE SIDE ON DESKTOP, HERO BANNER ON MOBILE) ─── */}
      <div className="w-full lg:w-1/2 h-56 sm:h-72 lg:h-auto lg:min-h-screen relative shrink-0 overflow-hidden bg-black flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16">
        {/* Full-bleed background image */}
        <Image
          src="/signin.jpg"
          alt="Siachen Border Security Force Salute"
          fill
          priority
          className="object-cover object-center scale-100 lg:scale-105 transition-transform duration-1000"
        />

        {/* Gradient overlays for cinematic depth and contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070B0F] via-black/30 to-black/50 lg:from-[#070B0F]/90 lg:via-black/40 lg:to-black/30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#070B0F] pointer-events-none hidden lg:block" />

        {/* Tactical Corner HUD Crosshairs */}
        <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-accent pointer-events-none" />
        <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-accent pointer-events-none" />
        <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-accent pointer-events-none" />
        <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-accent pointer-events-none" />

        {/* Top Header Tag on Image */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/75 backdrop-blur-md border border-white/20 text-accent text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            SIACHEN BORDER GRID • C2 SECURE
          </div>
        </div>

        {/* Bottom Headline & Telemetry on Image (Desktop) */}
        <div className="relative z-10 hidden lg:block max-w-lg">
          <div className="text-accent text-xs font-mono font-bold tracking-widest uppercase mb-2">
            INTELLIGENT BORDER VIDEO ANALYTICS PLATFORM
          </div>
          <h2 className="text-white font-[family-name:var(--font-display)] text-3xl xl:text-4xl leading-tight tracking-tight mb-3 drop-shadow-md">
            Guarding National Sovereignty With Autonomous Intelligence.
          </h2>
          <p className="text-gray-300 text-sm leading-relaxed mb-6 drop-shadow">
            Multi-camera edge AI inference, real-time intrusion scoring, and Hyperledger Fabric blockchain evidence verification.
          </p>

          <div className="pt-4 border-t border-white/20 flex items-center justify-between text-xs font-mono text-gray-300">
            <div>SECTOR: SIACHEN FORWARD HQ</div>
            <div className="text-green-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> FABRIC VALIDATED
            </div>
          </div>
        </div>
      </div>

      {/* ─── SIDE 2: AUTHENTICATION / PLACEHOLDERS PANEL ─── */}
      <div className="w-full lg:w-1/2 min-h-[calc(100vh-14rem)] lg:min-h-screen flex flex-col justify-between p-6 sm:p-10 md:p-14 lg:p-16 xl:p-20 overflow-y-auto bg-[#070B0F]">
        
        {/* Top Bar */}
        <div className="flex items-center justify-between pb-4 sm:pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-none bg-accent/15 border border-[#37B9FF]/30 flex items-center justify-center overflow-hidden">
              <Image src="/logo.png" alt="Logo" width={36} height={36} className="w-full h-full object-contain p-1" priority />
            </div>
            <div>
              <div className="text-sm sm:text-base font-bold tracking-tight text-white">
                IBVAP COMMAND
              </div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                Terminal Auth Portal
              </div>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-none bg-red-500/15 border border-red-500/30 text-[9px] sm:text-[10px] font-mono font-bold text-red-500 tracking-wider">
            AUTHORIZED PERSONNEL ONLY
          </div>
        </div>

        {/* Center Content Form (Clean & Open - No nested small cards) */}
        <div className="w-full max-w-md mx-auto my-auto py-8 sm:py-10">
          
          {error && (
            <div className="mb-6 p-3.5 rounded-none bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: CREDENTIALS SIGN-IN */}
          {step === 'CREDENTIALS' && (
            <div className="animate-fade-in">
              <div className="mb-8">
                <div className="text-accent text-[11px] font-mono font-bold tracking-widest uppercase mb-1.5">
                  OPERATOR VERIFICATION • STEP 1 OF 2
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Sign in to Command Center
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm mt-2">
                  Enter your official IBVAP operator email or service identifier to initialize verification.
                </p>
              </div>

              <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                {/* Username Input with clean placeholder */}
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-2">
                    Official Email or Service ID
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. operator@ibvap.gov.in"
                      className="w-full bg-[#0D131A] border border-[#233140] rounded-none pl-10 pr-3 h-12 text-sm text-white placeholder:text-gray-500 focus:border-accent focus:bg-[#111922] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Password Input with clean placeholder */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-300 block">
                      Security Passcode
                    </label>
                    <span className="text-[11px] font-mono text-muted-foreground">CONFIDENTIAL</span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter security passcode"
                      className="w-full bg-[#0D131A] border border-[#233140] rounded-none pl-10 pr-11 h-12 text-sm text-white placeholder:text-gray-500 focus:border-accent focus:bg-[#111922] focus:outline-none transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white p-1 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Options row */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-gray-400 cursor-pointer hover:text-gray-200">
                    <input
                      type="checkbox"
                      checked={rememberSession}
                      onChange={(e) => setRememberSession(e.target.checked)}
                      className="w-4 h-4 rounded-none bg-[#0D131A] border-[#233140] text-accent focus:ring-0 cursor-pointer"
                    />
                    Keep session active
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      showToast({
                        title: 'Passcode Recovery',
                        message: 'Please contact Border Sector Command Post (BSF Ops Room) for credential reset.',
                        type: 'info',
                      })
                    }
                    className="text-accent hover:underline font-medium"
                  >
                    Forgot passcode?
                  </button>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-accent hover:bg-accent/90 text-[#071018] font-bold text-sm rounded-none transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-60 shadow-lg shadow-accent/20"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#071018] border-t-transparent rounded-full animate-spin" />
                      Verifying Security Credentials...
                    </>
                  ) : (
                    <>
                      Verify & Proceed to Biometrics <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: FACE RECOGNITION (BIOMETRIC VERIFICATION) */}
          {step === 'FACE_VERIFICATION' && (
            <div className="animate-fade-in flex flex-col items-center text-center">
              <div className="mb-6 w-full text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-accent text-[11px] font-mono font-bold tracking-widest uppercase">
                    BIOMETRIC SCAN • STEP 2 OF 2
                  </span>
                  <span className="text-green-500 text-xs font-mono flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Passcode Verified
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Face Recognition Verification
                </h2>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                  Position your face within the camera frame for automated neural verification.
                </p>
              </div>

              {/* Face Scanner Component */}
              <div className="w-full flex justify-center">
                <FaceScanner onVerificationComplete={handleFaceVerificationComplete} accessToken={accessToken} />
              </div>

              <button
                onClick={() => setStep('CREDENTIALS')}
                className="mt-6 text-xs text-muted-foreground hover:text-white transition-colors flex items-center gap-1.5"
              >
                ← Return to Credentials
              </button>
            </div>
          )}
        </div>

        {/* Bottom Security Footer */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
            National Border Security Grid • All Terminal Operations Cryptographically Logged
          </p>
          <span className="text-[10px] font-mono text-muted-foreground">
            v1.0.0 SECURE C2
          </span>
        </div>
      </div>
    </div>
  );
}
