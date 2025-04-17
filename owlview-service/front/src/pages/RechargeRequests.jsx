import React, { useEffect, useState } from "react";
import apiClient from "../utils/axiosConfig";
import styles from "../styles/RechargeRequests.module.css";

const RechargeRequests = ({ user }) => {
  const [requests, setRequests] = useState([]);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [requestedPoints, setRequestedPoints] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user.role === "organization") {
          const pointsResponse = await apiClient.get(`/user/points/${user.id}`);
          setCurrentPoints(pointsResponse.data.points);

          const requestsResponse = await apiClient.get(`/recharge_requests/organization/${user.id}`);
          if (requestsResponse.data.success) {
            setRequests(requestsResponse.data.requests);
          }
        } else if (user.role === "admin") {
          const requestsResponse = await apiClient.get("/recharge_requests");
          if (requestsResponse.data.success) {
            setRequests(requestsResponse.data.requests);
          }
        }
      } catch (err) {
        console.error("Помилка завантаження даних:", err);
        setError("Відбулася помилка при завантаженні даних.");
      }
    };

    fetchData();
  }, [user.id, user.role]);

  const handleSubmitRequest = async () => {
    if (!requestedPoints || requestedPoints <= 0) {
      setError("Введіть коректну кількість балів");
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      const response = await apiClient.post("/recharge_request", {
        organizationId: user.id,
        requestedPoints,
        description,
      });

      if (response.data.success) {
        setSuccessMessage("Заявка успішно відправлена");
        setRequestedPoints("");
        setDescription("");
        setRequests((prev) => [
          {
            id: Date.now(),
            requested_points: requestedPoints,
            description,
            created_at: new Date().toLocaleString(),
            status: "pending",
          },
          ...prev,
        ]);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      console.error("Помилка при надсиланні заявки:", err);
      setError("Відбулася помилка при надсиланні заявки.");
    }
  };

  const handleAction = async (requestId, action, adminComment = "") => {
    try {
      const response = await apiClient.post(`/recharge_request/${requestId}`, {
        adminId: user.id,
        status: action,
        adminComment,
      });

      if (response.data.success) {
        setRequests((prev) =>
          prev.map((req) =>
            req.id === requestId ? { ...req, status: action, admin_comment: adminComment } : req
          )
        );
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      console.error("Помилка обробки заявки:", err);
      setError("Відбулася помилка при оновленні заявки.");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return <span className={`${styles.statusBadge} ${styles.pending}`}>В обробці</span>;
      case "approved":
        return <span className={`${styles.statusBadge} ${styles.approved}`}>Схвалено</span>;
      case "rejected":
        return <span className={`${styles.statusBadge} ${styles.rejected}`}>Відхилено</span>;
      default:
        return <span className={styles.statusBadge}>{status}</span>;
    }
  };

  if (user.role === "organization") {
    return (
      <div className={styles.rechargeContainer}>
        <h2>Поповнення балансу</h2>

        <div className={styles.balanceInfo}>
          <p>Поточний баланс: {currentPoints} балів</p>
          <p>Еквівалент: {currentPoints / 2} грн</p>
        </div>

        <div className={styles.requestForm}>
          <h3>Запросити поповнення</h3>
          <input
            type="number"
            placeholder="Кількість балів"
            value={requestedPoints}
            onChange={(e) => setRequestedPoints(e.target.value)}
          />
          <textarea
            placeholder="Опис (необов'язково)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button onClick={handleSubmitRequest}>Надіслати заявку</button>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {successMessage && <div className={styles.success}>{successMessage}</div>}

        <div className={styles.requestsTable}>
          <h3>Ваші заявки</h3>
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Запрошено балів</th>
                <th>Опис</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td>{new Date(req.created_at).toLocaleString()}</td>
                  <td>{req.requested_points}</td>
                  <td>{req.description || "-"}</td>
                  <td>{getStatusBadge(req.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (user.role === "admin") {
    return (
      <div className={styles.requestsContainer}>
        <h2>Заявки на поповнення балансу</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Назва </th>
              <th>Баланс</th>
              <th>Запрошено балів</th>
              <th>Еквівалент</th>
              <th>Опис</th>
              <th>Дата</th>
              <th>Статус</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id}>
                <td>{req.id}</td>
                <td>{req.organization_name}</td>
                <td>{req.current_points}</td>
                <td>{req.requested_points}</td>
                <td>{req.equivalent_uah}</td>
                <td>{req.description || "-"}</td>
                <td>{new Date(req.created_at).toLocaleString()}</td>
                <td>{getStatusBadge(req.status)}</td>
                <td>
                  {req.status === "pending" && (
                    <div className={styles.actions}>
                      <button
                        className={`${styles.actionButton} ${styles.approve}`}
                        onClick={() => handleAction(req.id, "approved")}
                      >
                        Схвалити
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.reject}`}
                        onClick={() => handleAction(req.id, "rejected")}
                      >
                        Відхилити
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {error && <div className={styles.error}>{error}</div>}
      </div>
    );
  }

  return <div className={styles.error}>У вас немає доступу до цієї сторінки.</div>;
};

export default RechargeRequests;