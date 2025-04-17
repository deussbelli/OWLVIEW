import React, { useState } from 'react';
import { Alert, AlertTitle } from '../components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import Spinner from '../components/ui/spinner';
import styles from "../styles/VerificationAlert.module.css";

const VerificationAlert = ({
  onRequestCode,
  onVerify,
  message,
  adminApprovalRequired = false,
  onVerifiedSuccess,
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const handleRequestCode = async () => {
    setIsLoading(true);
    try {
      await onRequestCode();
      setIsCodeSent(true);
      setError('');
    } catch (err) {
      setError('Не вдалося надіслати код підтвердження. Спробуйте знову.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Будь ласка, введіть коректний 6-значний код.');
      return;
    }
    setIsLoading(true);
    try {
      await onVerify(verificationCode);
      setError('');
      setSuccessMessage('Email успішно підтверджено!');
      if (onVerifiedSuccess) {
        onVerifiedSuccess();
      }
    } catch (err) {
      setError('Невірний код. Будь ласка, спробуйте знову.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Alert className={styles.alert}>
        <AlertTitle className={styles.alertTitle}>Потрібна верифікація</AlertTitle>
        <p className={styles.alertMessage}>
          {message || 'Ваш обліковий запис повинен бути підтверджений, щоб продовжити використання всіх функцій.'}
        </p>
      </Alert>

      {!adminApprovalRequired && (
        <Card className={styles.card}>
          <CardHeader>
            <CardTitle className={styles.cardTitleD}>Підтвердження email</CardTitle>
          </CardHeader>
          <CardContent>
            {!isCodeSent ? (
              <button
                onClick={handleRequestCode}
                className={styles.sendButton}
                disabled={isLoading}
              >
                {isLoading ? <Spinner size="small" /> : 'Надіслати код підтвердження'}
              </button>
            ) : (
              <div className={styles.codeContainer}>
                <div className={styles.codeInputs}>
                  {[...Array(6)].map((_, i) => (
                    <input
                      key={i}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className={styles.codeDigit}
                      value={verificationCode[i] || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/, '');
                        if (!val) return;
                        const newCode = verificationCode.split('');
                        newCode[i] = val;
                        setVerificationCode(newCode.join('').slice(0, 6));
                        const nextInput = document.getElementById(`code-input-${i + 1}`);
                        if (nextInput) nextInput.focus();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !verificationCode[i] && i > 0) {
                          const prevInput = document.getElementById(`code-input-${i - 1}`);
                          if (prevInput) prevInput.focus();
                        }
                      }}
                      id={`code-input-${i}`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleVerify}
                  className={`${styles.verifyButton} ${verificationCode.length === 6 ? styles.active : ''
                    }`}
                  disabled={verificationCode.length !== 6 || isLoading}
                >
                  {isLoading ? <Spinner size="small" /> : 'Підтвердити'}
                </button>
              </div>
            )}

            {successMessage && (
              <p className={styles.successMessage}>{successMessage}</p>
            )}
            {error && (
              <p className={styles.errorMessage}>{error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {adminApprovalRequired && successMessage && (
        <Alert className={styles.adminAlert}>
          <AlertTitle className={styles.adminAlertTitle}>Чекання підтвердження адміном</AlertTitle>
          <p className={styles.adminAlertMessage}>
            Email підтверджено, але ваш обліковий запис зареєстрований як організація та вимагає додаткового підтвердження адміністратором.
          </p>
        </Alert>
      )}
    </div>
  );
};

export default VerificationAlert;