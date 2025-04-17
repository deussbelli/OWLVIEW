import React, { useEffect, useState } from "react";
import apiClient from "../utils/axiosConfig";
import styles from "../styles/UserWithdrawals.module.css";

const UserWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWithdrawals = async () => {
      try {
        const response = await apiClient.get("/admin/withdrawals", {
          headers: { role: "admin" }
        });
        if (response.data.success) {
          setWithdrawals(response.data.withdrawals);
        } else {
          setError(response.data.message || "Не вдалося завантажити дані.");
        }
      } catch (err) {
        setError(err.message || "Помилка завантаження даних.");
      } finally {
        setLoading(false);
      }
    };

    fetchWithdrawals();
  }, []);

  const handleAction = async (withdrawalId, action) => {
    try {
      const response = await apiClient.post(
        `/admin/withdrawal/${withdrawalId}`,
        { action },
        { headers: { role: "admin" } }
      );
      if (response.data.success) {
        setWithdrawals((prev) =>
          prev.map((withdrawal) =>
            withdrawal.id === withdrawalId
              ? { ...withdrawal, status: action === "approve" ? "approved" : "rejected" }
              : withdrawal
          )
        );
        alert(response.data.message);
      } else {
        alert(response.data.message || "Помилка при обробці заявки.");
      }
    } catch (err) {
      alert(err.message || "Помилка під час виконання дії.");
    }
  };

  if (loading) return <p>Завантаження...</p>;
  if (error) return <p className={styles.error}>{error}</p>;

  return (
    <div className={styles.container}>
      <h2>Висновки користувачів</h2>
      {withdrawals.length === 0 ? (
        <p>Немає заявок на виведення балів.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Дата</th>
              <th>Роль</th>
              <th>Баланс</th>
              <th>Вивід</th>
              <th>грн</th>
              <th>Тип</th>
              <th>Призначення</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.map((withdrawal) => (
              <tr key={withdrawal.id}>
                <td>{withdrawal.user_id}</td>
                <td>{withdrawal.created_at}</td>
                <td>{withdrawal.user_role}</td>
                <td>{withdrawal.current_points}</td>
                <td>{withdrawal.withdraw_amount}</td>
                <td>{withdrawal.equivalent_uah.toFixed(2)}</td>
                <td>{withdrawal.type === "mobile" ? "Мобільний" : "Благодійність"}</td>
                <td>
                  {withdrawal.type === "mobile"
                    ? withdrawal.phone_number
                    : withdrawal.charity_link}
                </td>
                <td>
                  {withdrawal.status === "pending" ? (
                    <>
                      <button
                        className={styles.approveButton}
                        onClick={() => handleAction(withdrawal.id, "approve")}
                      >
                        Погодити
                      </button>
                      <button
                        className={styles.rejectButton}
                        onClick={() => handleAction(withdrawal.id, "reject")}
                      >
                        Відмовити
                      </button>
                    </>
                  ) : (
                    <span
                      className={
                        withdrawal.status === "approved"
                          ? styles.approvedStatus
                          : styles.rejectedStatus
                      }
                    >
                      {withdrawal.status === "approved" ? "Погоджено" : "Відмовлено"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UserWithdrawals;
