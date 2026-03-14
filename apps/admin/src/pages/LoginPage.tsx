import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { requestOtp, verifyOtp } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { ShieldCheck, FileCheck, Building2, ArrowLeft, LockKeyhole } from 'lucide-react';

const OTP_LENGTH = 6;

type Step = 'phone' | 'otp';

/**
 * LoginPage — two-step passwordless auth: phone → OTP.
 *
 * Layout:
 *  - Mobile: centred card (full width)
 *  - Desktop (lg+): split — left saffron-gold panel + right card column
 *
 * OTP step uses 6 individual digit boxes with auto-advance and paste support.
 * All mutation logic, API calls and navigation are unchanged.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  /** One string per OTP digit box — joined to a 6-char string before submit. */
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [sessionId, setSessionId] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');

  const otpInputRefs = useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null));

  // ── Mutations (logic unchanged) ────────────────────────────────────────────

  const requestOtpMutation = useMutation({
    mutationFn: (phoneNumber: string) => requestOtp(phoneNumber),
    onSuccess: (result) => {
      setSessionId(result.sessionId);
      setStep('otp');
      setPhoneError('');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to send OTP. Please try again.';
      setPhoneError(message);
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: ({ otpCode }: { phoneNumber: string; otpCode: string }) =>
      verifyOtp(sessionId, otpCode),
    onSuccess: (result) => {
      setUser(result.user);
      navigate(result.user.role === 'SUPER_ADMIN' ? '/superadmin' : '/dashboard', { replace: true });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Invalid OTP. Please try again.';
      setOtpError(message);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      // Return focus to first box so user can retype immediately
      setTimeout(() => otpInputRefs.current[0]?.focus(), 0);
    },
  });

  // ── Form handlers ──────────────────────────────────────────────────────────

  function handlePhoneSubmit(e: React.FormEvent): void {
    e.preventDefault();
    setPhoneError('');
    const cleaned = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number');
      return;
    }
    requestOtpMutation.mutate(cleaned);
  }

  function handleOtpSubmit(e: React.FormEvent): void {
    e.preventDefault();
    setOtpError('');
    const cleaned = otpDigits.join('');
    if (cleaned.length !== OTP_LENGTH) {
      setOtpError('Enter the 6-digit OTP sent to your number');
      return;
    }
    verifyOtpMutation.mutate({ phoneNumber: phone.replace(/\D/g, ''), otpCode: cleaned });
  }

  // ── OTP box interactions ───────────────────────────────────────────────────

  function handleOtpDigitChange(index: number, value: string): void {
    // Accept only the last digit typed (handles autofill injecting multiple chars)
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    setOtpError('');
    // Auto-advance focus to the next box on digit entry
    if (digit && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>): void {
    // On Backspace in an empty box, clear the previous box and move focus back
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const next = [...otpDigits];
      next[index - 1] = '';
      setOtpDigits(next);
      otpInputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>): void {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next: string[] = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]!;
    setOtpDigits(next);
    setOtpError('');
    // Move focus to the last filled box (or last box if fully filled)
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    otpInputRefs.current[focusIndex]?.focus();
  }

  function handleChangeNumber(): void {
    setStep('phone');
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setOtpError('');
  }

  const otpFilled = otpDigits.join('').length === OTP_LENGTH;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — desktop only ──────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, hsl(var(--brand-primary)) 0%, hsl(var(--gold-accent)) 100%)',
        }}
        aria-hidden="true"
      >
        {/* Subtle dot-grid decoration */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Logo + headline */}
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-white/20 ring-2 ring-white/30 flex items-center justify-center mb-6">
            <span className="text-white font-bold text-xl tracking-tight select-none">DS</span>
          </div>
          <p className="text-white font-bold text-3xl leading-tight mb-2">DevaSeva</p>
          <p className="text-white/75 text-base">Built for Indian Temples</p>
        </div>

        {/* Trust bullets */}
        <ul className="relative space-y-5" aria-label="Key features">
          {[
            { icon: <ShieldCheck size={15} />, text: 'Secure OTP sign-in — no passwords ever' },
            { icon: <FileCheck size={15} />, text: '80G-compliant receipts sent via WhatsApp instantly' },
            { icon: <Building2 size={15} />, text: 'Trusted by temples across India' },
          ].map(({ icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5 text-white">
                {icon}
              </span>
              <span className="text-white/90 text-sm leading-snug">{text}</span>
            </li>
          ))}
        </ul>

        <p className="relative text-white/40 text-xs">Infosware Solutions Pvt. Ltd.</p>
      </div>

      {/* ── Right panel — always visible ───────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-bg-page relative overflow-hidden">

        {/* Ambient blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-brand-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-brand-primary/5 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-sm"
        >
          {/* Card */}
          <div className="bg-bg-surface border border-border-subtle rounded-xl shadow-modal p-8">

            {/* Brand mark */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-brand-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0 select-none">
                DS
              </div>
              <div>
                <h1 className="text-h3 font-bold text-text-primary leading-tight">DevaSeva</h1>
                <p className="text-caption text-text-muted">Temple Management</p>
              </div>
            </div>

            <AnimatePresence mode="wait">

              {/* ── Step 1: Phone ──────────────────────────────────────── */}
              {step === 'phone' ? (
                <motion.form
                  key="phone-step"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handlePhoneSubmit}
                  className="space-y-5"
                >
                  <div>
                    <h2 className="text-h2 font-bold text-text-primary">Sign in</h2>
                    <p className="mt-1 text-body text-text-secondary">
                      Enter your registered mobile number
                    </p>
                  </div>

                  <Input
                    label="Mobile Number"
                    type="tel"
                    inputMode="numeric"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setPhoneError('');
                    }}
                    error={phoneError}
                    autoFocus
                    maxLength={10}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={requestOtpMutation.isPending}
                  >
                    {requestOtpMutation.isPending ? 'Sending OTP…' : 'Send OTP'}
                  </Button>
                </motion.form>

              ) : (

                /* ── Step 2: OTP ─────────────────────────────────────── */
                <motion.form
                  key="otp-step"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleOtpSubmit}
                  className="space-y-5"
                >
                  <div>
                    <h2 className="text-h2 font-bold text-text-primary">Enter OTP</h2>
                    <p className="mt-1 text-body text-text-secondary">
                      Sent to{' '}
                      <span className="text-text-primary font-medium">{phone}</span>
                    </p>
                  </div>

                  {/* Six individual digit boxes */}
                  <div>
                    <label className="block text-label font-medium text-text-primary mb-3">
                      6-Digit OTP
                    </label>
                    <div
                      className="flex gap-2 justify-between"
                      role="group"
                      aria-label="One-time password input"
                    >
                      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                        <input
                          key={i}
                          ref={(el) => { otpInputRefs.current[i] = el; }}
                          type="tel"
                          inputMode="numeric"
                          maxLength={1}
                          value={otpDigits[i]}
                          autoFocus={i === 0}
                          aria-label={`OTP digit ${i + 1} of ${OTP_LENGTH}`}
                          onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          onPaste={handleOtpPaste}
                          className={[
                            'w-11 h-14 rounded-lg text-center text-h3 font-bold',
                            'border-2 bg-bg-surface-2 text-text-primary',
                            'transition-all duration-150 outline-none cursor-text',
                            'focus:bg-bg-surface focus:border-brand-primary focus:shadow-glow',
                            otpError
                              ? 'border-danger'
                              : otpDigits[i]
                                ? 'border-brand-primary'
                                : 'border-border-default',
                          ].join(' ')}
                        />
                      ))}
                    </div>

                    {otpError && (
                      <p className="mt-2 text-caption text-danger" role="alert">
                        {otpError}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={verifyOtpMutation.isPending || !otpFilled}
                  >
                    {verifyOtpMutation.isPending ? 'Verifying…' : 'Verify OTP'}
                  </Button>

                  <button
                    type="button"
                    onClick={handleChangeNumber}
                    className="w-full flex items-center justify-center gap-1.5 py-1 cursor-pointer text-caption text-text-muted hover:text-text-secondary transition-colors"
                  >
                    <ArrowLeft size={13} aria-hidden="true" />
                    Change number
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Security note */}
          <div className="flex items-center justify-center gap-1.5 mt-4 text-caption text-text-muted">
            <LockKeyhole size={12} aria-hidden="true" />
            <span>Secure · 256-bit encrypted</span>
          </div>

          <p className="text-center text-caption text-text-muted mt-2">
            Infosware Solutions Pvt. Ltd.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
