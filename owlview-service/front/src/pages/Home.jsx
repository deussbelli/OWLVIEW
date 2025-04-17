import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Home.module.css";
import apiClient from "../utils/axiosConfig";
import VerificationAlert from './VerificationAlert';
import OwlLogo from '../assets/owl-logo-animated.svg';

const Home = ({ user }) => {
  const navigate = useNavigate();
  const [isVerified, setIsVerified] = useState(user?.is_verified === 1);
  const [adminApprovalRequired, setAdminApprovalRequired] = useState(false);
  const [stats, setStats] = useState({
    users: 0,
    surveys: 0,
    responses: 0,
    organizations: 0,
    activeSurveys: 0,
    completionRate: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await apiClient.get('/platform-stats');
        setStats({
          users: data.users || 0,
          surveys: data.surveys || 0,
          responses: data.responses || 0,
          organizations: data.organizations || 0,
          activeSurveys: data.active_surveys || 0,
          completionRate: data.completion_rate || 0
        });
      } catch (error) {
        console.error("Помилка під час завантаження статистики:", error);
      }
    };

    fetchStats();
  }, []);

  const handleSendEmail = () => {
    window.location.href = "mailto:owlview.ts@gmail.com?subject=Восстановление%20доступа";
  };

  if (user?.is_blocked === 1) {
    return (
      <div className={styles.blockedContainer}>
        <div className={styles.blockedIcon}>🚫</div>
        <h1 className={styles.blockedTitle}>Акаунт заблоковано</h1>
        <p className={styles.blockedText}>
          На жаль, доступ до вашого облікового запису був обмежений адміністратором.
        </p>
        <p className={styles.blockedText}>
          Щоб відновити доступ, зв'яжіться з підтримкою за адресою <strong>owlview.ts@gmail.com</strong>.
        </p>
        <button onClick={handleSendEmail} className={styles.blockedButton}>
          Написати на підтримку
        </button>
      </div>
    );
  }

  if (user?.is_blocked === 2) {
    return (
      <div className={styles.blockedContainer}>
        <div className={styles.blockedIcon}>⏳</div>
        <h1 className={styles.blockedTitle}>Тимчасове блокування</h1>
        <p className={styles.blockedText}>
          Ваш обліковий запис тимчасово обмежений. Доступ буде відновлено автоматично.
        </p>

        <div className={styles.blockedDetails}>
          <p><strong>Початок блокування:</strong> {user.block_start_date} {user.block_start_time}</p>
          <p><strong>Закінчення блокування:</strong> {user.block_end_date} {user.block_end_time} </p>
          <p><strong>Причина:</strong> {user.reason}</p>
        </div>

        <button onClick={handleSendEmail} className={styles.blockedButton}>
          Оскаржувати блокування
        </button>
      </div>
    );
  }

  useEffect(() => {
    const fetchUserVerificationStatus = async () => {
      try {
        const { data } = await apiClient.get('/user-status');

        if (data.is_verified !== 1) {
          setIsVerified(false);
          return;
        }

        setIsVerified(true);

        if (user?.role === 'organization' && data.authentication_by_admin !== 1) {
          setAdminApprovalRequired(true);
        } else {
          setAdminApprovalRequired(false);
        }

      } catch (error) {
        console.error("Помилка при отриманні статусу верифікації:", error);
      }
    };

    if (user) {
      fetchUserVerificationStatus();
    }
  }, [user]);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      try {
        const { data } = await apiClient.post("/profile-complete", {
          user_id: user?.id,
          role: user?.role
        });

        if (data.success && data.profile_complete === false) {
          navigate("/personal_cabinet");
        }
      } catch (error) {
        console.error("Помилка під час перевірки профілю:", error);
      }
    };

    if (user && isVerified && !adminApprovalRequired) {
      checkProfileCompletion();
    }
  }, [user, isVerified, adminApprovalRequired, navigate]);

  const handleRequestCode = async () => {
    try {
      const response = await apiClient.post('/request-verification', {}, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` }
      });
      if (!response.data.success) {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Помилка запиту коду підтвердження:", error);
      alert("Не вдалося надіслати код підтвердження. Повторіть спробу.");
    }
  };

  const handleVerify = async (code) => {
    try {
      const response = await apiClient.post('/verify-code', { code }, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` }
      });

      if (response.data.success) {
        const { data } = await apiClient.get('/user-status');
        setIsVerified(data.is_verified === 1);

        if (user?.role === 'organization') {
          setAdminApprovalRequired(data.authentication_by_admin !== 1);
        }
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Помилка підтвердження коду:", error);
      throw new Error(error.response?.data?.message || "Verification failed");
    }
  };

  if (user && !isVerified) {
    return (
      <VerificationAlert
        onRequestCode={handleRequestCode}
        onVerify={handleVerify}
        adminApprovalRequired={adminApprovalRequired}
      />
    );
  }

  if (user && adminApprovalRequired) {
    return (
      <VerificationAlert
        adminApprovalRequired={true}
        message="Ваш обліковий запис успішно підтверджений по email, але очікує підтвердження адміністратором."
      />
    );
  }

  return (
    <div className={styles.homeContainer}>
      <div className={styles.animatedBackground}></div>
      <img src={OwlLogo} alt="Owl Logo" className={styles.owlLogo} />
      <h1>Ласкаво просимо до OwlView</h1>
      <p className={styles.subtitle}>
        Це платформа для проведення опитувань, управління користувачами та
        організаціями. Отримуйте метрики, статистику та багато іншого.
      </p>
      <div className={styles.statsSection}>
        <div className={styles.statCard}>
          <h3 className={styles.statNumber}>{105640 + stats.users}+</h3>
          <p className={styles.statLabel}>Користувачів</p>
        </div>
        <div className={styles.statCard}>
          <h3 className={styles.statNumber}>{1050 + stats.surveys}+</h3>
          <p className={styles.statLabel}>Опитувань створено</p>
        </div>
        <div className={styles.statCard}>
          <h3 className={styles.statNumber}>{1109220 + stats.responses}+</h3>
          <p className={styles.statLabel}>Відповідей отримано</p>
        </div>
      </div>

      <div className={styles.featuresSection}>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>📊</div>
          <h3>Створюйте опитування</h3>
          <p>Розробляйте опитування з різними типами питань та налаштовуйте їх зовнішній вигляд</p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>📈</div>
          <h3>Аналізуйте результати</h3>
          <p>Отримуйте детальну статистику та візуалізацію результатів опитувань</p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>👥</div>
          <h3>Керуйте користувачами</h3>
          <p>Просте управління доступом та контроль над користувачами системи</p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>🏢</div>
          <h3>Для організацій</h3>
          <p>Керуйте командою та розподіляйте доступи між співробітниками</p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>🔒</div>
          <h3>Безпека</h3>
          <p>Захист даних та конфіденційність респондентів</p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>🔄</div>
          <h3>Інтеграція</h3>
          <p>Використання API AI Gemini для допомоги у розробці опитувань</p>
        </div>
      </div>
    </div>
  );
};

export default Home;