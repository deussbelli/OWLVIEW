import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Login.module.css";
import apiClient from "../utils/axiosConfig";
import { GoogleLogin } from "@react-oauth/google";
import GoogleLogo from '../assets/icons8-google.svg';

const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});

  const validateFields = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = "Уведіть пошту";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Некорректний формат пошти";
    }
    if (!password.trim()) {
      newErrors.password = "Уведіть пароль";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const canLogin = () => {
    return email.trim().length > 0 && password.trim().length > 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateFields()) {
      return;
    }

    try {
      const response = await apiClient.post("/login", { email, password });
      if (response.data.success) {
        alert("Ласкаво просимо!");
        const { user } = response.data;

        sessionStorage.setItem("authToken", user.token);
        sessionStorage.setItem("user", JSON.stringify(user));

        if (onLoginSuccess) {
          onLoginSuccess(user);
        }

        navigate("/");
      } else {
        alert("Помилка: " + response.data.message);
      }
    } catch (err) {
      console.error("Помилка під час логіну:", err);
      alert("Відбулася помилка при вході!");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      console.log("Отримана відповідь від Google:", credentialResponse);
      const idToken = credentialResponse.credential;

      if (!idToken) {
        console.error("ID-токен відсутній у відповіді Google");
        alert("Помилка при вході через Google: відсутній токен.");
        return;
      }

      console.log("Відправляємо токен на бекенд:", idToken.substring(0, 20) + "...");

      const fullUrl = apiClient.getUri() + "/google-auth";
      console.log("Повний URL запиту:", fullUrl);

      const response = await apiClient.post("/google-auth", { token: idToken });

      if (response.data.success) {
        const { user } = response.data;
        sessionStorage.setItem("authToken", user.token);
        sessionStorage.setItem("user", JSON.stringify(user));

        if (onLoginSuccess) {
          onLoginSuccess(user);
        }

        navigate("/");
      } else {
        alert("Помилка при вході через Google: " + response.data.message);
      }
    } catch (err) {
      console.error("Помилка при Google Login:", err);
      if (err.response) {
        console.log("Статус:", err.response.status);
        console.log("Дані:", err.response.data);
        console.log("Хедери:", err.response.headers);
      } else if (err.request) {
        console.log("Запит було зроблено, але відповідь не отримана:", err.request);
      } else {
        console.log("Помилка налаштування запиту:", err.message);
      }
      alert(`Сталася помилка при вході через Google.`);
    }
  };

  const handleGoogleError = () => {
    console.error("Google Login Failed");
    alert("Google Login Failed!");
  };

  const GoogleLoginButton = () => {
    const googleRef = useRef();
    const [iconError, setIconError] = useState(false);
  
    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => googleRef.current.click()}
          className={styles.googleButton}
        >
          <span className={`${styles.googleIconContainer} ${iconError ? styles.fallback : ''}`}>
            <img 
              src={GoogleLogo} 
              alt="Google logo" 
              className={styles.googleIcon}
              onError={() => setIconError(true)}
            />
          </span>
          Вхід через Google
        </button>
        
        <div style={{ opacity: 0, position: 'absolute', left: 0, top: 0 }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={false}
            ref={googleRef}
          />
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <h1>Авторизація</h1>

      <form onSubmit={handleLogin}>
        <div className={styles.formGroup}>
          <label>Пошта</label>
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((prev) => ({ ...prev, email: "" }));
            }}
          />
          {errors.email && <div className={styles.error}>{errors.email}</div>}
        </div>

        <div className={styles.formGroup}>
          <label>Пароль</label>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((prev) => ({ ...prev, password: "" }));
            }}
          />
          {errors.password && <div className={styles.error}>{errors.password}</div>}
        </div>

        <button
          type="submit"
          className={styles.button}
          disabled={!canLogin()}
        >
          Вхід
        </button>
      </form>
      <div style={{ marginTop: "20px" }}>
        <GoogleLoginButton />
      </div>
      <div style={{ marginTop: "20px" }}>
        <a href="/registration">У мене немає акаунту</a>
      </div>
    </div>
  );
};

export default Login;