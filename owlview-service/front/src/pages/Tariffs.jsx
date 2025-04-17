import React, { useState, useEffect } from "react";
import styles from "../styles/Tariffs.module.css";
import apiClient from "../utils/axiosConfig";
const statusColors = {
  "Активна": "statusActive",
  "Черновик": "statusDraft",
  "Завершена": "statusCompleted"
};

const TariffsPage = ({ user }) => {
  const [tariffs, setTariffs] = useState([]);
  const [userDetails, setUserDetails] = useState(null);
  const [newTariff, setNewTariff] = useState({
    id: null,
    vipNumber: "",
    price: "",
    duration: "",
    startDate: "",
    endDate: "",
    title: "",
    description: "",
    questionTypes: [],
    status: "Черновик",
  });
  const [showForm, setShowForm] = useState(false);
  const [questionTypes] = useState([
    101, 102, 103, 104, 105, 201, 202, 301, 302, 303, 304, 305, 306,
    401, 402, 403, 404, 405, 501, 502, 503, 504, 505, 506, 507, 601, 602, 603,
    701, 702, 703, 704, 801, 802,
  ]);

  useEffect(() => {
    fetchTariffs();
    fetchUserDetails();
  }, []);

  const fetchTariffs = async () => {
    try {
      const response = await apiClient.get("/tariffs");
      if (user.role === "admin") {
        setTariffs(response.data);
      } else {
        setTariffs(response.data.filter((tariff) => tariff.status === "Активна"));
      }
    } catch (error) {
      console.error("Не вдалося отримати тарифи:", error);
    }
  };

  const fetchUserDetails = async () => {
    try {
      const response = await apiClient.get(`/users/${user.id}`);
      setUserDetails(response.data);
    } catch (error) {
      console.error("Не вдалося отримати відомості про користувача:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTariff((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuestionTypeChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setNewTariff((prev) => {
      if (prev.questionTypes.includes(value)) {
        return {
          ...prev,
          questionTypes: prev.questionTypes.filter((type) => type !== value),
        };
      } else {
        return { ...prev, questionTypes: [...prev.questionTypes, value] };
      }
    });
  };

  const handleSaveTariff = async () => {
    if (user.role === "admin" && newTariff.vipNumber === "1") {
      alert("Адміністратор не може встановити VIP номер 1.");
      return;
    }

    if (
      !newTariff.title ||
      !newTariff.price ||
      !newTariff.duration ||
      !newTariff.vipNumber ||
      !newTariff.startDate ||
      !newTariff.endDate ||
      newTariff.questionTypes.length === 0
    ) {
      alert("Будь ласка, заповніть всі обов'язкові поля.");
      return;
    }

    try {
      if (newTariff.id) {
        await apiClient.put(`/tariffs/${newTariff.id}`, newTariff);
        setTariffs((prev) =>
          prev.map((t) => (t.id === newTariff.id ? { ...t, ...newTariff } : t))
        );
        alert("Тариф успішно оновлено!");
      } else {
        const response = await apiClient.post("/tariffs", newTariff);
        setTariffs((prev) => [...prev, { ...newTariff, id: response.data.id }]);
        alert("Тариф успішно додано!");
      }
      resetForm();
    } catch (error) {
      console.error("Помилка збереження тарифу:", error);
      alert("Помилка збереження тарифу.");
    }
  };

  const handleDeleteTariff = async (id) => {
    if (!window.confirm("Ви впевнені, що хочете видалити цей тариф?")) return;
    try {
      await apiClient.delete(`/tariffs/${id}`);
      setTariffs((prev) => prev.filter((tariff) => tariff.id !== id));
    } catch (error) {
      console.error("Помилка під час видалення тарифу:", error);
    }
  };

  const handlePurchaseTariff = async (tariff) => {
    if (!window.confirm(`Ви впевнені, що хочете придбати тариф "${tariff.title}"?`)) return;

    try {
      const response = await apiClient.post(`/tariffs/${tariff.id}/purchase`, {
        userId: user.id,
      });

      if (response.data.success) {
        alert("Тариф успішно придбано!");
        setUserDetails((prev) => ({
          ...prev,
          points: prev.points - tariff.price,
          vip: tariff.vipNumber,
        }));
        fetchTariffs();
      } else {
        alert(response.data.message || "Помилка при покупці тарифу.");
      }
    } catch (error) {
      console.error("Помилка при покупці тарифу:", error);
      alert("Помилка при покупці тарифу.");
    }
  };

  const handleCancelTariff = async (tariff) => {
    try {
      const response = await apiClient.post(`/tariffs/${tariff.id}/cancel`, {
        userId: user.id,
      });
      if (response.data.success) {
        alert("Тариф успішно скасовано!");
        setUserDetails((prev) => ({ ...prev, vip: 0 }));
        setTariffs((prev) =>
          prev.map((t) =>
            t.id === tariff.id ? { ...t, status: "Активна" } : t
          )
        );
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.error("Помилка при скасуванні тарифу:", error);
      alert("Помилка при скасуванні тарифу");
    }
  };

  const resetForm = () => {
    setNewTariff({
      id: null,
      vipNumber: "",
      price: "",
      duration: "",
      startDate: "",
      endDate: "",
      title: "",
      description: "",
      questionTypes: [],
      status: "Черновик",
    });
    setShowForm(false);
  };

  const handleEditTariff = (tariff) => {
    setNewTariff({ ...tariff });
    setShowForm(true);
  };

  const toggleForm = () => {
    resetForm();
    setShowForm(!showForm);
  };

  const renderTariffCard = (tariff) => (
    <div key={tariff.id} className={styles.tariffCard}>
      <div className={`${styles.statusBadge} ${styles[statusColors[tariff.status]]}`}>
        {tariff.status}
      </div>
      <div className={styles.priceBadge}>
        {tariff.price} балів
      </div>
      <h3>{tariff.title}</h3>
      <p>{tariff.description}</p>
      <p><strong>Термін дії:</strong> {tariff.duration} днів</p>
      <p><strong>Дата початку:</strong> {new Date(tariff.startDate).toLocaleDateString()}</p>
      <p><strong>Дата завершення:</strong> {new Date(tariff.endDate).toLocaleDateString()}</p>
      <p><strong>VIP номер:</strong> {tariff.vipNumber}</p>

      {tariff.questionTypes && tariff.questionTypes.length > 0 && (
        <div>
          <p><strong>Доступні питання:</strong></p>
          <ul>
            {tariff.questionTypes.map((type) => (
              <li key={type}>{type}</li>
            ))}
          </ul>
        </div>
      )}

      {user.role === "admin" && (
        <div className={styles.adminControls}>
          <button onClick={() => handleEditTariff(tariff)}>Редагувати</button>
          <button onClick={() => handleDeleteTariff(tariff.id)}>Видалити</button>
        </div>
      )}
      {(user.role === "organization" || user.role === "client") && tariff.status === "Активна" && (
        <button
          onClick={() =>
            userDetails && userDetails.vip === tariff.vipNumber
              ? handleCancelTariff(tariff)
              : handlePurchaseTariff(tariff)
          }
          disabled={
            !userDetails ||
            (userDetails.points < tariff.price &&
              userDetails.vip !== tariff.vipNumber)
          }
        >
          {userDetails && userDetails.vip === tariff.vipNumber
            ? "Відмовитись"
            : !userDetails || userDetails.points < tariff.price
              ? "Недостатньо балів"
              : "Отримати"}
        </button>
      )}
    </div>
  );

  return (
    <div className={styles.tariffsContainer}>
          <h2>Тарифи</h2>
      {user.role === "admin" && (
        <div className={styles.adminSection}>
          <button onClick={toggleForm} className={styles.toggleFormButton}>
            {showForm ? " X " : "Додати новий тариф"}
          </button>

          {showForm && (
            <div className={styles.addTariffForm}>
              <h2>{newTariff.id ? "Редагувати тариф" : "Додати новий тариф"}</h2>
              <label>
                Назва:
                <input
                  type="text"
                  name="title"
                  value={newTariff.title}
                  onChange={handleInputChange}
                />
              </label>
              <label>
                Ціна (бали):
                <input
                  type="number"
                  name="price"
                  value={newTariff.price}
                  onChange={handleInputChange}
                />
              </label>
              <label>
                Термін дії (днів):
                <input
                  type="number"
                  name="duration"
                  value={newTariff.duration}
                  onChange={handleInputChange}
                />
              </label>
              <label>
                VIP номер:
                <input
                  type="number"
                  name="vipNumber"
                  value={newTariff.vipNumber}
                  onChange={handleInputChange}
                />
              </label>
              <label>
                Статус:
                <select
                  name="status"
                  value={newTariff.status}
                  onChange={handleInputChange}
                >
                  <option value="Черновик">Чернетка</option>
                  <option value="Активна">Активна</option>
                  <option value="Завершена">Завершена</option>
                </select>
              </label>
              <label>
                Дата початку:
                <input
                  type="datetime-local"
                  name="startDate"
                  value={newTariff.startDate}
                  onChange={handleInputChange}
                />
              </label>
              <label>
                Дата завершення:
                <input
                  type="datetime-local"
                  name="endDate"
                  value={newTariff.endDate}
                  onChange={handleInputChange}
                />
              </label>
              <label>
                Опис:
                <textarea
                  name="description"
                  value={newTariff.description}
                  onChange={handleInputChange}
                />
              </label>
              <div className={styles.questionTypes}>
                <p>Типи питань:</p>
                <div className={styles.questionGrid}>
                  {questionTypes.map((type) => (
                    <label
                      key={type}
                      className={`${styles.questionLabel} ${newTariff.questionTypes.includes(type) ? styles.activeQuestion : ''}`}
                    >
                      <input
                        type="checkbox"
                        value={type}
                        checked={newTariff.questionTypes.includes(type)}
                        onChange={handleQuestionTypeChange}
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.formButtons}>
                <button onClick={handleSaveTariff}>
                  {newTariff.id ? "Зберігти зміни" : "Додати тариф"}
                </button>
                <button type="button" onClick={toggleForm}>
                  Скасувати
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={styles.tariffsList}>
        {tariffs.length === 0 ? (
          <p className={styles.noTariffs}>Тарифи відсутні</p>
        ) : (
          tariffs.map(renderTariffCard)
        )}
      </div>

    </div>
  );
};

export default TariffsPage;
