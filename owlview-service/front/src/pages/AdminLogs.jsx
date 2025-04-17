import React, { useState, useEffect } from "react";
import apiClient from "../utils/axiosConfig";
import styles from "../styles/AdminLogs.module.css";
import axios from "axios";

const AdminLogs = () => {
  const logTypes = [
    { value: "registration_user", label: "Логи реєстрації (користувачі)" },
    { value: "registration_org", label: "Логи реєстрації (організації)" },
    { value: "login_user", label: "Логи входу (користувачі)" },
    { value: "login_org", label: "Логи входу (організації)" },
    { value: "login_admin", label: "Логи входу (адміністр.)" },
    { value: "verify_org", label: "Логи верифікації орг." },
    { value: "tariff_create", label: "Логи тарифів (створення)" },
    { value: "tariff_purchase", label: "Логи тарифів (купівля)" },
    { value: "survey_create", label: "Логи опитувань (створення)" },
    { value: "survey_delete", label: "Логи опитувань (видалення)" },
    { value: "user_block", label: "Логи користувачів (блокування)" },
    { value: "user_delete", label: "Логи користувачів (видалення)" },
    { value: "user_admin_assign", label: "Логи призначень адмін." },
    { value: "error", label: "Логи помилок" },
    { value: "message_send", label: "Логи надсилання повідомлень" },
    { value: "notification_send", label: "Логи надсилання оповіщень" },
    { value: "score_withdraw", label: "Логи балів (висновок)" },
    { value: "score_receive", label: "Логи балів (отримання)" },
  ];

  const [selectedTypes, setSelectedTypes] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userId, setUserId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleTypeChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setSelectedTypes([...selectedTypes, value]);
    } else {
      setSelectedTypes(selectedTypes.filter((t) => t !== value));
    }
  };

  const handleApply = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const response = await apiClient.post(
        "/logs/filter",
        {
          logTypes: selectedTypes,
          dateFrom: dateFrom,
          dateTo: dateTo,
          userId: userId,
          projectId: projectId,
        }
      );
      if (response.data.success) {
        setLogs(response.data.logs);
      } else {
        setErrorMsg(response.data.message || "Помилка при отриманні логів");
      }
    } catch (err) {
      console.error("Помилка при отриманні логів:", err);
      setErrorMsg("Помилка при отриманні логів");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!logs.length) {
      setErrorMsg("Немає даних для завантаження");
      return;
    }

    const lines = [];
    lines.push("LOG_ID | LOG_DATE | LOG_TYPE | USER_ID | PROJECT_ID | DESCRIPTION");

    logs.forEach((log) => {
      const line = `${log.log_id} | ${log.log_date} | ${log.log_type} | ${log.user_id || ""} | ${log.project_id || ""} | ${log.description || ""}`;
      lines.push(line);
    });

    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "logs.txt");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <h2>Сторінка лога</h2>

      <div className={styles.filtersBlock}>
        <h4>Типи логів:</h4>
        <div className={styles.checkboxes}>
          {logTypes.map((lt) => (
            <label key={lt.value} className={styles.cbLabel}>
              <input
                type="checkbox"
                value={lt.value}
                checked={selectedTypes.includes(lt.value)}
                onChange={handleTypeChange}
              />
              {lt.label}
            </label>
          ))}
        </div>

        <h4>Фільтр за датою:</h4>
        <div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="От"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="До"
            style={{ marginLeft: "10px" }}
          />
        </div>

        <h4>Користувач (ID):</h4>
        <input
          type="text"
          placeholder="ID користувача"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />

        <h4>Проект (ID):</h4>
        <input
          type="text"
          placeholder="ID проекту"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        />

        <div className={styles.btns}>
          <button onClick={handleApply} disabled={loading}>
            {loading ? 'Завантаження даних...' : 'Застосувати'}
          </button>
          <button onClick={handleDownload} disabled={loading || !logs.length}>
            Завантажити .txt
          </button>
        </div>

        {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}
      </div>

      <div className={styles.tableBlock}>
        {loading ? (
          <div className={styles.loading}>Завантаження даних...</div>
        ) : logs.length > 0 ? (
          <table className={styles.logsTable}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Дата/час</th>
                <th>Тип лога</th>
                <th>Користувач</th>
                <th>Проект</th>
                <th>Опис</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.log_id}>
                  <td>{log.log_id}</td>
                  <td>{new Date(log.log_date).toLocaleString()}</td>
                  <td>{log.log_type}</td>
                  <td>{log.user_id || '-'}</td>
                  <td>{log.project_id || '-'}</td>
                  <td>{log.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            Немає даних для відображення. Використовуйте фільтри.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogs;