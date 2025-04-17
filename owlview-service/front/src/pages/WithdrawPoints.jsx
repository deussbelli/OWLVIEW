import React, { useState, useEffect } from "react";
import apiClient from "../utils/axiosConfig";
import styles from "../styles/WithdrawPoints.module.css";

const WithdrawPoints = ({ user }) => {
  const [points, setPoints] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [withdrawAmountMobile, setWithdrawAmountMobile] = useState("");
  const [charityLink, setCharityLink] = useState("");
  const [withdrawAmountCharity, setWithdrawAmountCharity] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const response = await apiClient.get(`/user/points/${user.id}`);
        setPoints(response.data.points);
      } catch (error) {
        console.error("Помилка при отриманні балів:", error);
      }
    };
    fetchPoints();
  }, [user.id]);

  const handleWithdraw = async (type) => {
    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    const amount = type === "mobile" ? withdrawAmountMobile : withdrawAmountCharity;

    if (amount > points) {
      setError("Недостатньо балів для виведення.");
      setIsLoading(false);
      return;
    }

    const requestData = {
      userId: user.id,
      amount: amount,
      type: type,
      ...(type === "mobile" ? { phoneNumber } : { charityLink })
    };

    try {
      const response = await apiClient.post("/withdraw", requestData);
      if (response.data.success) {
        setSuccessMessage(response.data.message);
        setPoints((prev) => prev - amount);
        if (type === "mobile") {
          setWithdrawAmountMobile("");
          setPhoneNumber("");
        } else {
          setWithdrawAmountCharity("");
          setCharityLink("");
        }
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error("Помилка при виведенні:", error);
      setError("Відбулася помилка при надсиланні заявки.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.withdrawContainer}>
      <h2>Вивести бали</h2>

      <div className={styles.pointsInfo}>
        <p>Поточні бали: <strong>{points}</strong></p>
        <p>Еквівалент у гривнях: <strong>{(points / 2).toFixed(2)} грн</strong></p>
      </div>

      <div className={styles.formSection}>
        <h3>Виведення на мобільний телефон</h3>
        <input
          type="text"
          placeholder="Введіть номер телефону"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className={styles.inputField}
        />
        <input
          type="number"
          placeholder="Введіть кількість балів"
          value={withdrawAmountMobile}
          onChange={(e) => setWithdrawAmountMobile(e.target.value)}
          className={styles.inputField}
        />
        <button
          onClick={() => handleWithdraw("mobile")}
          disabled={isLoading || !phoneNumber || !withdrawAmountMobile}
          className={styles.submitButton}
        >
          {isLoading ? "Надсилання..." : "Надіслати заявку"}
        </button>
      </div>

      <div className={styles.formSection}>
        <h3>Висновок на благодійність</h3>
        <input
          type="text"
          placeholder="Введіть посилання на монобанку"
          value={charityLink}
          onChange={(e) => setCharityLink(e.target.value)}
          className={styles.inputField}
        />
        <input
          type="number"
          placeholder="Введіть кількість балів"
          value={withdrawAmountCharity}
          onChange={(e) => setWithdrawAmountCharity(e.target.value)}
          className={styles.inputField}
        />
        <button
          onClick={() => handleWithdraw("charity")}
          disabled={isLoading || !charityLink || !withdrawAmountCharity}
          className={styles.submitButton}
        >
          {isLoading ? "Надсилання..." : "Надіслати заявку"}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {successMessage && <p className={styles.success}>{successMessage}</p>}
    </div>
  );
};

export default WithdrawPoints;