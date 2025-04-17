import React, { useEffect, useState } from "react";
import apiClient from "../utils/axiosConfig";
import styles from "../styles/MyWithdrawals.module.css";

const MyWithdrawals = ({ user }) => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWithdrawals = async () => {
      try {
        const response = await apiClient.get(`/user/withdrawals/${user.id}`);
        if (response.data.success) {
          setWithdrawals(response.data.withdrawals);
        } else {
          setError("Не вдалося завантажити історію висновків.");
        }
      } catch (error) {
        console.error("Помилка при завантаженні історії висновків:", error);
        setError("Відбулася помилка при завантаженні даних.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchWithdrawals();
  }, [user.id]);

  if (isLoading) {
    return (
      <div className={styles.withdrawalsContainer}>
        <div className="loading-spinner">Завантаження...</div>
      </div>
    );
  }

  if (error) {
    return <p className={styles.error}>{error}</p>;
  }

  if (withdrawals.length === 0) {
    return <p className={styles.noData}>У вас поки що немає виводів.</p>;
  }

  return (
    <div className={styles.withdrawalsContainer}>
      <h2>Мої виводи</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Дата</th>
            <th>Кількість балів</th>
            <th>Еквівалент (грн)</th>
            <th>Тип виводу</th>
            <th>Номер телефону/Посилання</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {withdrawals.map((withdrawal, index) => (
            <tr key={index} data-status={withdrawal.status?.toLowerCase()}>
              <td>{new Date(withdrawal.date).toLocaleDateString()}</td>
              <td>{withdrawal.amount}</td>
              <td>{withdrawal.equivalent_uah}</td>
              <td>{withdrawal.type === "mobile" ? "Мобільний" : "Благодійність"}</td>
              <td>
                {withdrawal.type === "mobile"
                  ? withdrawal.phone_number
                  : (
                    <a href={withdrawal.charity_link} target="_blank" rel="noopener noreferrer">
                      {withdrawal.charity_link}
                    </a>
                  )}
              </td>
              <td>
                <span
                  className={
                    withdrawal.status === "approved"
                      ? styles.approvedStatus
                      : withdrawal.status === "pending"
                        ? styles.pendingStatus
                        : withdrawal.status === "rejected"
                          ? styles.rejectedStatus
                          : ""
                }>
                  {withdrawal.status === "approved" && "Погоджено"}
                  {withdrawal.status === "pending" && "В обробці"}
                  {withdrawal.status === "rejected" && "Відмовлено"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MyWithdrawals;