import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../utils/axiosConfig";
import styles from "../styles/VerificationPage.module.css";

const VerificationPage = ({ user }) => {
  const [organizations, setOrganizations] = useState([]);
  const [reason, setReason] = useState("");
  const [selectedOrg, setSelectedOrg] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== "admin") {
      alert("У вас немає доступу до цієї сторінки.");
      navigate("/");
      return;
    }
    fetchOrganizations();
  }, [user, navigate]);

  const fetchOrganizations = async () => {
    try {
      const response = await apiClient.get("/organizations");
      if (response.data.success) {
        setOrganizations(response.data.organizations);
      } else {
        console.error("Помилка сервера:", response.data.message);
      }
    } catch (error) {
      console.error("Помилка при завантаженні організацій:", error);
    }
  };

  const handleApprove = async (id) => {
    try {
      await apiClient.post("/organizations/approve", { id });
      setOrganizations((prev) => prev.filter((org) => org.id !== id));
      alert("Організація успішно верифікована!");
    } catch (error) {
      console.error("Помилка верифікації:", error);
      alert("Не вдалося верифікувати організацію.");
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      alert("Введіть причину відмови!");
      return;
    }

    try {
      await apiClient.post("/organizations/reject", { id: selectedOrg, reason });
      setOrganizations((prev) => prev.filter((org) => org.id !== selectedOrg));
      setReason("");
      setSelectedOrg(null);
      alert("Організація успішно відхилена!");
    } catch (error) {
      console.error("Помилка відхилення:", error);
      alert("Не вдалося відхилити організацію.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.animatedBackground}></div>
      <h1>Верифікація організацій</h1>

      {organizations.length > 0 ? (
        <div className={styles.tableWrapper}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Керівник</th>
                <th>Дата реєстрації</th>
                <th>Email</th>
                <th>Назва</th>
                <th>Мета реєстрації</th>
                <th>Соцмережі</th>
                <th>Документи</th>
                <th>Сайт</th>
                <th>Дії</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id}>
                  <td>{org.id}</td>
                  <td>{org.head_name}</td>
                  <td>{org.registration_date}</td>
                  <td>{org.email}</td>
                  <td>{org.name}</td>
                  <td>{org.registration_goal || "Не вказано"}</td>
                  <td>
                    {Object.entries(org.social_links).map(([key, value]) =>
                      value ? (
                        <div key={key}>
                          {key}: <span>{value}</span>
                        </div>
                      ) : null
                    )}
                  </td>
                  <td>
                    {org.documents_path ? (
                      <a href={org.documents_path} target="_blank" rel="noopener noreferrer">
                        {org.documents_path}
                      </a>
                    ) : (
                      "Немає даних"
                    )}
                  </td>
                  <td>
                    <a href={org.website} target="_blank" rel="noopener noreferrer">
                      {org.website || "Немає даних"}
                    </a>
                  </td>
                  <td>
                    {(org.is_verified !== 1 && !org.rejection_reason) ||
                      (org.is_verified === 1 && !org.rejection_reason) && (
                        <div className={styles.buttonGroup}>
                          <button
                            className={`${styles.button} ${styles.approveButton}`}
                            onClick={() => handleApprove(org.id)}
                          >
                            Підтвердити
                          </button>
                          <button
                            className={`${styles.button} ${styles.rejectButton}`}
                            onClick={() => setSelectedOrg(org.id)}
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
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📭</div>
          <p>Немає організацій для верифікації</p>
        </div>
      )}

      {selectedOrg && (
        <div className={styles.rejectionModal}>
          <div className={styles.modalContent}>
            <h2>Причина відмови</h2>
            <textarea
              className={styles.textarea}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Вкажіть причину відмови у верифікації..."
            />
            <button
              className={`${styles.button} ${styles.submitButton}`}
              onClick={handleReject}
            >
              Надіслати
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationPage;