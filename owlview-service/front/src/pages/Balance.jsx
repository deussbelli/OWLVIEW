import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Balance.module.css";
import apiClient from "../utils/axiosConfig";
import WithdrawPoints from "./WithdrawPoints";
import MyWithdrawals from "./MyWithdrawals";
import RechargeRequests from "./RechargeRequests";
import UserWithdrawals from "./UserWithdrawals";

const Balance = ({ user }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("withdraw");

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const getTabsForRole = () => {
    const tabs = [
      { name: "Вивести бали", id: "withdraw" },
      { name: "Мої виводи", id: "myWithdrawals" },
    ];

    if (user?.role === "admin" || user?.role === "organization") {
      tabs.push({ name: "Поповнення балансу", id: "recharge" });
    }

    if (user?.role === "admin") {
      tabs.push({ name: "Виводи користувачів", id: "userWithdrawals" });
    }

    return tabs;
  };

  const tabs = getTabsForRole();

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "withdraw":
        return <WithdrawPoints user={user} />;
      case "myWithdrawals":
        return <MyWithdrawals user={user} />;
      case "recharge":
        return <RechargeRequests user={user} />;
      case "userWithdrawals":
        return <UserWithdrawals />;
      default:
        return (
          <div className={styles.tabContent}>
            <p>Оберіть вкладку для відображення вмісту.</p>
          </div>
        );
    }
  };

  return (
    <div className={styles.balanceContainer}>
      <h1>Баланс та поповнення рахунку</h1>
      <div className={styles.tabsContainer}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.activeTab : ""
              }`}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.name}
          </button>
        ))}
      </div>
      {renderTabContent()}
    </div>
  );
};

export default Balance;