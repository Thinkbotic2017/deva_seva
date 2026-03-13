import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { requestOtp, verifyOtp } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';

type Step = 'phone' | 'otp';

/**
 * LoginPage — two-step passwordless auth: phone → OTP.
 * On success, user is stored in Zustand and redirected to /dashboard or /superadmin.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');

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
      setOtp('');
    },
  });

  function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhoneError('');
    const cleaned = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number');
      return;
    }
    requestOtpMutation.mutate(cleaned);
  }

  function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOtpError('');
    const cleaned = otp.replace(/\D/g, '');
    if (cleaned.length !== 6) {
      setOtpError('Enter the 6-digit OTP sent to your number');
      return;
    }
    verifyOtpMutation.mutate({ phoneNumber: phone.replace(/\D/g, ''), otpCode: cleaned });
  }

  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center p-4">
      {/* Subtle brand background pattern */}
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
          {/* Brand */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-brand-primary flex items-center justify-center text-text-inverse font-bold text-sm flex-shrink-0">
              DS
            </div>
            <div>
              <h1 className="text-h3 font-bold text-text-primary leading-tight">DevaSeva</h1>
              <p className="text-caption text-text-muted">Temple Management</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
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

                <Input
                  label="6-Digit OTP"
                  type="tel"
                  inputMode="numeric"
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setOtpError('');
                  }}
                  error={otpError}
                  autoFocus
                  maxLength={6}
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={verifyOtpMutation.isPending}
                >
                  {verifyOtpMutation.isPending ? 'Verifying…' : 'Verify OTP'}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                    setOtpError('');
                  }}
                  className="w-full text-caption text-text-muted hover:text-text-secondary transition-colors py-1"
                >
                  ← Change number
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer note */}
        <p className="text-center text-caption text-text-muted mt-4">
          Infosware Solutions Pvt. Ltd.
        </p>
      </motion.div>
    </div>
  );
}
