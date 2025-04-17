import React, { useState, useEffect } from "react";
import apiClient from "../utils/axiosConfig";
import styles from "../styles/Notifications.module.css";

const Notifications = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [channel, setChannel] = useState("system");
  const [recipients, setRecipients] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [imageLink, setImageLink] = useState("");
  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canCreate = user?.role === "admin";

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/notifications", {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("authToken")}`,
        },
      });
      if (res.data.success) {
        setNotifications(res.data.notifications);
      } else {
        setError(res.data.message || "Помилка під час завантаження сповіщень");
      }
    } catch (err) {
      console.error("Помилка під час завантаження сповіщень:", err);
      setError("Помилка при завантаженні сповіщень");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleCreateNotification = async () => {
    if (!channel || !recipients || !subject || !message) {
      setError("Заповніть всі обов'язкові поля: Канал, Одержувачі, Тема, Текст");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const body = {
        channel,
        recipients,
        subject,
        message,
        image_link: imageLink,
        signature,
      };
      const res = await apiClient.post("/notifications", body, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("authToken")}`,
        },
      });
      if (res.data.success) {
        setChannel("system");
        setRecipients("");
        setSubject("");
        setMessage("");
        setImageLink("");
        setSignature("");
        fetchNotifications();
      } else {
        setError(res.data.message || "Не вдалося створити сповіщення");
      }
    } catch (err) {
      console.error("Помилка при створенні сповіщення:", err);
      setError("Помилка при створенні сповіщення");
    } finally {
      setLoading(false);
    }
  };


  const handleDeleteNotification = async (id) => {
    if (!window.confirm("Ви впевнені, що хочете видалити це сповіщення?")) return;
    try {
      setLoading(true);
      const res = await apiClient.delete(`/notifications/${id}`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("authToken")}`,
        },
      });
      if (res.data.success) {
        alert("Сповіщення видалено");
        fetchNotifications();
      } else {
        setError(res.data.message || "Не вдалося видалити сповіщення");
      }
    } catch (err) {
      console.error("Помилка при видаленні сповіщення:", err);
      setError("Помилка при видаленні сповіщення");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Видалити всі системні сповіщення? Ця дія необоротна.")) return;
    try {
      setLoading(true);
      const res = await apiClient.delete("/notifications", {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("authToken")}`,
        },
      });
      if (res.data.success) {
        alert("Всі системні сповіщення видалені");
        fetchNotifications();
      } else {
        setError(res.data.message || "Не вдалося видалити всі сповіщення");
      }
    } catch (err) {
      console.error("Помилка при видаленні всіх сповіщень:", err);
      setError("Помилка при видаленні всіх сповіщень");
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async (notificationId) => {
    try {
      await apiClient.post("/notifications/mark-as-viewed",
        { notification_id: notificationId },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("authToken")}`,
          },
        }
      );
      fetchNotifications();
    } catch (err) {
      console.error("Помилка при відмітці про перегляд:", err);
    }
  };

  return (
    <div className={styles.notificationsContainer}>
      <h2>Сповіщення</h2>
      {error && <div className={styles.error}>{error}</div>}
      {loading && <div className={styles.loading}>Завантаження...</div>}

      {canCreate && (
        <div className={styles.createForm}>
          <h3>Створити сповіщенняе</h3>
          <div>
            <label>Канал відправки:</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              disabled={loading}
            >
              <option value="system">система</option>
              <option value="email">пошта</option>
            </select>
          </div>

          <div>
            <label>Отримувачі:</label>
            <input
              type="text"
              placeholder='@all або ID через кому (наприклад "1,2,3")'
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
            />
          </div>

          <div>
            <label>Тема:</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div>
            <label>Текст:</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div>
            <label>Посилання на зображення (необов'язково):</label>
            <input
              type="text"
              value={imageLink}
              onChange={(e) => setImageLink(e.target.value)}
            />
          </div>

          <div>
            <label>Підпис (необов'язково):</label>
            <input
              type="text"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
            />
          </div>

          <button
            onClick={handleCreateNotification}
            disabled={loading}
          >
            {loading ? 'Збереження...' : 'Зберегти'}
          </button>
        </div>
      )}
      <div className={styles.listContainer}>
        <h3>Всі сповіщення</h3>
        {notifications.length === 0 && (
          <div className={styles.notificationItem}>Сповіщення відсутні</div>
        )}
        {notifications.map((notif) => (
          <div key={notif.id} className={styles.notificationItem}>
            {user?.role === "admin" && (
              <>
                <div>
                  <strong>Канал:</strong> {notif.channel}
                </div>
                <div>
                  <strong>Автор (ID):</strong> {notif.created_by}
                </div>
              </>
            )}

            <div>
              <strong>Тема:</strong> {notif.subject}
            </div>
            <div>
              <strong>Текст:</strong> {notif.message}
            </div>

            {notif.image_link && (
              <div>
                <strong>Зображення:</strong>{" "}
                <img
                  src={notif.image_link}
                  alt="notification"
                  style={{ maxWidth: "200px", display: "block", marginTop: "5px" }}
                />
              </div>
            )}

            {notif.signature && (
              <div>
                <strong>Підпис:</strong> {notif.signature}
              </div>
            )}

            <div>
              <strong>Дата створення:</strong> {notif.created_at}
            </div>

            {user?.role === "admin" && notif.channel === "system" && (
              <div>
                <strong>Статистика:</strong> {notif.read_count} / {notif.recipients_count}{" "}
                (подивилися / відправлено)
              </div>
            )}

            {notif.channel === "system" && user?.role !== "admin" && !notif.was_viewed && (
              <button onClick={() => markAsViewed(notif.id)}>
                Позначити як "Переглянуто"
              </button>
            )}

            {notif.can_delete && (
              <button onClick={() => handleDeleteNotification(notif.id)}>
                Видалити
              </button>
            )}
          </div>
        ))}
      </div>
      {canCreate && (
        <button
          onClick={handleDeleteAll}
          className={styles.deleteAllBtn}
          disabled={loading || notifications.length === 0}
        >
          Видалити всі сповіщення
        </button>
      )}
    </div>
  );
};

export default Notifications;
