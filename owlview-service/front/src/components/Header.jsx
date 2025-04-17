import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Header.module.css";
import apiClient from "../utils/axiosConfig";
import OwlLogo from '../assets/owl-logo-animated.svg';

const Header = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [surveyInvitationsCount, setSurveyInvitationsCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [activeTab, setActiveTab] = useState("Головна");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const response = await apiClient.get("/home-data", {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("authToken")}`,
          },
        });
        if (response.data.success) {
          setUnreadMessages(response.data.unreadMessages);
          setPendingVerifications(response.data.pendingVerifications);
          setSurveyInvitationsCount(response.data.surveyInvitationsCount);
          setUnreadNotifications(response.data.unreadNotifications);
        }
      } catch (error) {
        console.error("Помилка при завантаженні home-data:", error);
      }
    };

    const path = window.location.pathname;
    if (path === "/") setActiveTab("Головна");
    else if (path === "/surveys") setActiveTab("Опитування");
    else if (path === "/users") setActiveTab("Користувачі");
    else if (path === "/admin-user-surveys") setActiveTab("Опитування користувачів");
    else if (path === "/tariffs") setActiveTab("Тарифи");
    else if (path === "/personal_cabinet") setActiveTab("Особистий кабінет");
    else if (path === "/balance") setActiveTab("Баланс і поповнення рахунку");
    else if (path === "/support") setActiveTab("Технічна підтримка");
    else if (path === "/verification") setActiveTab("Верифікація організацій");
    else if (path === "/notifications") setActiveTab("Сповіщення");
    else if (path === "/news") setActiveTab("Новини");
    else if (path === "/logs") setActiveTab("Логи");

    if (user) {
      fetchHomeData();

      const handleResize = () => {
        if (window.innerWidth > 1024) {
          setSidebarOpen(false);
        }
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [user, window.location.pathname]);

  const mainNavItems = [
    { name: "Головна", icon: "🏠", path: "/" },
    { name: "Опитування", icon: "📋", path: "/surveys", badge: surveyInvitationsCount },
    { name: "Користувачі", icon: "👥", path: "/users" },
    { name: "Сповіщення", icon: "🔔", path: "/notifications", badge: unreadNotifications },
    { name: "Підтримка", icon: "🛠️", path: "/support", badge: unreadMessages }
  ];

  const adminTabs = [
    { name: "Головна", icon: "🏠", path: "/" },
    { name: "Опитування", icon: "📋", path: "/surveys", badge: surveyInvitationsCount },
    { name: "Користувачі", icon: "👥", path: "/users" },
    { name: "Опитування користувачів", icon: "📊", path: "/admin-user-surveys" },
    { name: "Логи", icon: "📝", path: "/logs" },
    { name: "Сповіщення", icon: "🔔", path: "/notifications", badge: unreadNotifications },
    { name: "Технічна підтримка", icon: "🛠️", path: "/support", badge: unreadMessages },
    { name: "Верифікація організацій", icon: "✅", path: "/verification", badge: pendingVerifications },
    { name: "Баланс та поповнення рахунку", icon: "💰", path: "/balance" },
    { name: "Тарифи", icon: "💼", path: "/tariffs" },
    { name: "Особистий кабінет", icon: "👤", path: "/personal_cabinet" },
    { name: "Новини", icon: "📰", path: "/news" },
  ];

  const clientTabs = [
    { name: "Головна", icon: "🏠", path: "/" },
    { name: "Опитування", icon: "📋", path: "/surveys", badge: surveyInvitationsCount },
    { name: "Користувачі", icon: "👥", path: "/users" },
    { name: "Сповіщення", icon: "🔔", path: "/notifications", badge: unreadNotifications },
    { name: "Технічна підтримка", icon: "🛠️", path: "/support", badge: unreadMessages },
    { name: "Баланс та поповнення рахунку", icon: "💰", path: "/balance" },
    { name: "Тарифи", icon: "💼", path: "/tariffs" },
    { name: "Особистий кабінет", icon: "👤", path: "/personal_cabinet" },
    { name: "Новини", icon: "📰", path: "/news" },
  ];

  const organizationTabs = [
    { name: "Головна", icon: "🏠", path: "/" },
    { name: "Опитування", icon: "📋", path: "/surveys", badge: surveyInvitationsCount },
    { name: "Користувачі", icon: "👥", path: "/users" },
    { name: "Сповіщення", icon: "🔔", path: "/notifications", badge: unreadNotifications },
    { name: "Технічна підтримка", icon: "🛠️", path: "/support", badge: unreadMessages },
    { name: "Баланс та поповнення рахунку", icon: "💰", path: "/balance" },
    { name: "Тарифи", icon: "💼", path: "/tariffs" },
    { name: "Особистий кабінет", icon: "👤", path: "/personal_cabinet" },
    { name: "Новини", icon: "📰", path: "/news" },
  ];

  let availableTabs = [];
  if (user?.role === "admin") {
    availableTabs = adminTabs;
  } else if (user?.role === "client") {
    availableTabs = clientTabs;
  } else if (user?.role === "organization") {
    availableTabs = organizationTabs;
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      const token = sessionStorage.getItem("authToken");
      if (!token) {
        alert("Токен відсутній. Будь ласка, авторизуйтесь.");
        return;
      }

      const response = await apiClient.post("/logout", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        sessionStorage.removeItem("authToken");
        sessionStorage.removeItem("user");
        alert("Ви успішно вийшли із системи!");
        navigate("/login");
        if (onLogout) onLogout();
      } else {
        alert("Помилка: " + response.data.message);
      }
    } catch (error) {
      console.error("Помилка при виході:", error);
      alert("Не вдалося вийти із системи.");
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.logo} onClick={() => navigate("/")}>
          OwlView
          {/* <img src={OwlLogo} alt="Owl Logo" className={styles.owlLogo} /> */}
        </div>

        {user && (
          <>
            <div className={styles.headerNav}>
              {mainNavItems.map((item, index) => (
                <button
                  key={index}
                  className={`${styles.navButton} ${activeTab === item.name ? styles.active : ''}`}
                  onClick={() => handleNavigation(item.path)}
                >
                  <span>{item.icon}</span>
                  {item.name}
                  {item.badge > 0 && (
                    <span className={styles.notificationBadge}>{item.badge}</span>
                  )}
                </button>
              ))}
            </div>

            <div className={styles.userInfo}>
              <button onClick={() => navigate("/personal_cabinet")} className={styles.cabinetButton}>
                👤 Профіль
              </button>
              <button onClick={handleLogout} className={styles.logoutButton}>
                🚪 Вихід
              </button>

              <div className={styles.menuIcon} onClick={toggleSidebar}>
                <span>☰</span>
              </div>
            </div>
          </>
        )}

        {!user && (
          <div className={styles.authButtons}>
            <button onClick={() => navigate("/login")} className={styles.loginButton}>
              Увійти
            </button>
            <button onClick={() => navigate("/registration")} className={styles.registerButton}>
              Реєстрація
            </button>
          </div>
        )}
      </div>

      {user && (
        <div className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
          <div className={styles.tabsContainer}>
            <ul className={styles.tabsList}>
              {availableTabs.map((tab, index) => (
                <li
                  key={index}
                  onClick={() => handleNavigation(tab.path)}
                  className={activeTab === tab.name ? styles.active : ''}
                >
                  <div>
                    <span className={styles.tabIcon}>{tab.icon}</span>
                    <span className={styles.tabName}>{tab.name}</span>
                  </div>

                  {tab.badge > 0 && (
                    <span className={styles.notificationBadge}>{tab.badge}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;