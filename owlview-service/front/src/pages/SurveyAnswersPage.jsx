import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import apiClient from "../utils/axiosConfig";
import SurveyFilledPreview from "./SurveyFilledPreview";
import styles from "../styles/SurveyAnswersPage.module.css";

export default function SurveyAnswersPage() {
  const { surveyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState(null);
  const [answersData, setAnswersData] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showNotifyForm, setShowNotifyForm] = useState(false);
  const [notifyAll, setNotifyAll] = useState(false);
  const [notifyType, setNotifyType] = useState("system");
  const [notifyText, setNotifyText] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [answersResp, surveyResp] = await Promise.all([
          apiClient.get(`/surveys/${surveyId}/all-answers`),
          apiClient.get(`/surveys/${surveyId}`)
        ]);
        if (answersResp.data.success) setAnswersData(answersResp.data.data || []);
        if (surveyResp.data.success) setSurvey(surveyResp.data.survey || null);
      } catch (err) {
        console.error("Помилка при завантаженні даних:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [surveyId]);

  const handleSelectUser = (uid) => {
    setSelectedUserId(uid);
  };

  const selectedUserObj = answersData.find((item) => item.userId === selectedUserId);

  const handleNotifyUser = (type) => {
    setNotifyAll(false);
    setNotifyType(type);
    const defText = `Добрий день!\nОпитування: ${survey?.survey_name || surveyId}\n...\n(Ваш текст)\nЗ повагою,\nАвтор опитування.`;
    setNotifyText(defText);
    setShowNotifyForm(true);
  };

  const handleNotifyAll = () => {
    setNotifyAll(true);
    setNotifyType("system");
    const defText = `Добрий день!\nОпитування: ${survey?.survey_name || surveyId}\n...\nЗ повагою,\nАвтор опитування.`;
    setNotifyText(defText);
    setShowNotifyForm(true);
  };

  const handleSendNotify = async () => {
    if (!notifyText.trim()) {
      alert("Текст повідомлення порожній.");
      return;
    }

    try {
      const body = { notifyType, text: notifyText };
      if (notifyAll) {
        body.all = true;
      } else {
        if (!selectedUserId) {
          alert("Не обрано отримувачів!");
          return;
        }
        body.userId = selectedUserId;
      }

      const resp = await apiClient.post(`/surveys/${surveyId}/notify`, body);
      if (resp.data.success) {
        alert("Повідомлення надіслано!");
        setShowNotifyForm(false);
      } else {
        alert("Помилка:" + resp.data.message);
      }
    } catch (err) {
      console.error("Помилка при надсиланні повідомлення:", err);
      alert("Мережева помилка або помилка сервера");
    }
  };

  if (loading || !survey) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Відповіді користувачів з опитування "{survey.survey_name}"</h1>
      </div>

      <div className={styles.usersList}>
        {answersData.map((item) => (
          <button
            key={item.userId}
            onClick={() => handleSelectUser(item.userId)}
            className={`${styles.userButton} ${item.userId === selectedUserId ? styles.active : ''}`}
          >
            {item.userId}
          </button>
        ))}
      </div>

      {selectedUserId && selectedUserObj && (
        <div className={styles.answersContainer}>
          <h3 className={styles.userAnswersTitle}>
            <i className="fas fa-user" /> Відповіді користувача {selectedUserId}
          </h3>
          <SurveyFilledPreview anketa={survey.anketa} userAnswers={selectedUserObj.answers} />
        </div>
      )}

      <div className={styles.notifyButtons}>
        {selectedUserId && (
          <>
            <button
              onClick={() => handleNotifyUser("system")}
              className={styles.notifyButton}
            >
              <i className="fas fa-bell" /> Сповістити в системі
            </button>
            <button
              onClick={() => handleNotifyUser("email")}
              className={styles.notifyButton}
            >
              <i className="fas fa-envelope" /> Сповістити на пошту
            </button>
          </>
        )}
        <button
          onClick={handleNotifyAll}
          className={`${styles.notifyButton} ${styles.notifyAllButton}`}
        >
          <i className="fas fa-users" /> Сповістити усіх
        </button>
      </div>

      {showNotifyForm && (
        <>
          <div className={styles.notifyFormOverlay} onClick={() => setShowNotifyForm(false)} />
          <div className={styles.notifyForm}>
            <div className={styles.notifyFormHeader}>
              <h3 className={styles.notifyFormTitle}>Надсилання повідомлення</h3>
              <button
                className={styles.notifyFormClose}
                onClick={() => setShowNotifyForm(false)}
              >
                &times;
              </button>
            </div>

            {notifyAll ? (
              <div className={styles.notifyTypeOptions}>
                <label className={styles.notifyTypeOption}>
                  <input
                    type="radio"
                    name="notifyType"
                    value="system"
                    checked={notifyType === "system"}
                    onChange={(e) => setNotifyType(e.target.value)}
                  />
                  <span>У системі</span>
                </label>
                <label className={styles.notifyTypeOption}>
                  <input
                    type="radio"
                    name="notifyType"
                    value="email"
                    checked={notifyType === "email"}
                    onChange={(e) => setNotifyType(e.target.value)}
                  />
                  <span>ННа пошту</span>
                </label>
              </div>
            ) : (
              <p>Сповіщаємо користувача: {selectedUserId}. Канал: {notifyType}</p>
            )}

            <textarea
              className={styles.notifyFormTextarea}
              value={notifyText}
              onChange={(e) => setNotifyText(e.target.value)}
            />

            <div className={styles.notifyFormActions}>
              <button
                className={styles.notifyFormCancel}
                onClick={() => setShowNotifyForm(false)}
              >
                Скасувати
              </button>
              <button
                className={styles.notifyFormSubmit}
                onClick={handleSendNotify}
              >
                Надіслати
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}