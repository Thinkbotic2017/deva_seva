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
 * On success, user is stored in Zustand and redirected to /dashboard.
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
      navigate('/dashboard', { replace: true });
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
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
                  Sent to <span className="text-text-primary font-medium">{phone}</span>
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
                className="w-full text-caption text-text-muted hover:text-text-secondary transition-colors"
              >
                ← Change number
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
