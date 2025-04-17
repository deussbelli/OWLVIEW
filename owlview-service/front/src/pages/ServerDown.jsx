import React from "react";
import styles from "../styles/ServerDown.module.css";

const ServerDown = () => {
  return (
    <div className={styles.serverDownContainer}>
      <div className={styles.errorBackground}></div>
      <div className={styles.errorIcon}>⚠️</div>
      <h1>Сервер тимчасово недоступний</h1>
      <p>Будь ласка, спробуйте оновити сторінку пізніше.</p>
      <div className={styles.loadingBar}>
        <div className={styles.loadingProgress}></div>
      </div>
      <button className={styles.retryButton}>Спробувати знову</button>
    </div>
  );
};

export default ServerDown;