import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../utils/axiosConfig";
import styles from "../styles/AdminUserSurveys.module.css";

export default function AdminUserSurveys({ user }) {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAllSurveys = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/admin/surveys", {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("authToken")}`,
        },
      });
      if (res.data.success) {
        setSurveys(res.data.surveys);
      } else {
        setError(res.data.message || "Помилка при отриманні списку опитувань");
      }
    } catch (err) {
      console.error("Помилка при запиті:", err);
      setError("Мережева помилка");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      fetchAllSurveys();
    }
  }, [user]);

  const handlePreview = (surveyId) => {
    navigate(`/admin-user-surveys/preview/${surveyId}`);
  };

  return (
    <div className={styles.surveysContainer}>
      <h2 className={styles.title}>Опитування користувачів</h2>

      {loading && <div className={styles.loadingSpinner}></div>}
      {error && <p className={styles.errorMessage}>{error}</p>}

      <div className={styles.tableWrapper}>
        <table className={styles.surveysTable}>
          <thead>
            <tr>
              <th>ID користувача</th>
              <th>ID опитування</th>
              <th>Назва</th>
              <th>Дата создания</th>
              <th>Статус</th>
              <th>Дія</th>
            </tr>
          </thead>
          <tbody>
            {surveys.map((s, index) => (
              <tr key={s.survey_id} style={{ animationDelay: `${index * 0.05}s` }}>
                <td>{s.owner_id}</td>
                <td>{s.survey_id}</td>
                <td>{s.survey_name}</td>
                <td>{new Date(s.creation_date).toLocaleDateString()}</td>
                <td>
                  <span className={`${styles.statusBadge} ${styles[s.status.toLowerCase()]}`}>
                    {s.status}
                  </span>
                </td>
                <td>
                  <button
                    className={styles.previewButton}
                    onClick={() => handlePreview(s.survey_id)}
                  >
                    Передпрогляд
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
