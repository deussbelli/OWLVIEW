import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Surveys.module.css";
import apiClient from "../utils/axiosConfig";
import { FiInbox, FiCheckCircle, FiEdit, FiEye, FiPlay } from "react-icons/fi";
import { FiPlus, FiMail, FiCheckSquare, FiActivity, FiEdit2, FiArchive } from "react-icons/fi";

const Surveys = ({ user }) => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("invitation");
  const [isLoading, setIsLoading] = useState(true);

  const [mySurveys, setMySurveys] = useState([]);
  const [draftSurveys, setDraftSurveys] = useState([]);
  const [finishedSurveys, setFinishedSurveys] = useState([]);
  const [passedSurveys, setPassedSurveys] = useState([]);
  const [invitations, setInvitations] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [surveysResp, invitesResp] = await Promise.all([
          apiClient.get("/surveys/my"),
          apiClient.get("/surveys/invitations")
        ]);

        if (surveysResp.data.success) {
          setMySurveys(surveysResp.data.mySurveys);
          setDraftSurveys(surveysResp.data.draftSurveys);
          setFinishedSurveys(surveysResp.data.finishedSurveys);
          setPassedSurveys(surveysResp.data.passedSurveys);
        }

        if (invitesResp.data.success) {
          setInvitations(invitesResp.data.invitations);
        }
      } catch (error) {
        console.error("Помилка під час завантаження:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    } else {
      navigate("/login");
    }
  }, [user, navigate]);

  const handleCreateSurvey = () => {
    navigate("/survey-editor");
  };

  const handleEditSurvey = (surveyId) => {
    navigate(`/survey-editor/${surveyId}`);
  };

  const handlePreviewSurvey = (surveyId) => {
    navigate(`/survey-preview/${surveyId}`);
  };

  const handleTakeSurvey = (surveyId) => {
    navigate(`/survey-pass/${surveyId}`);
  };

  const handleClaimReward = async (surveyId, reward) => {
    try {
      const resp = await apiClient.post(`/surveys/${surveyId}/claim-reward`);
      if (resp.data.success) {
        alert(`Вам нараховано ${reward}!`);
        const updatedInvites = invitations.map(inv =>
          inv.surveyId === surveyId ? { ...inv, status: "награда получена" } : inv
        );
        setInvitations(updatedInvites);
      } else {
        alert(resp.data.message || "Помилка при отриманні нагороди");
      }
    } catch (err) {
      console.error(err);
      alert("Виникла помилка при запиті");
    }
  };

  const renderSurveysTable = (surveys) => {
    if (surveys.length === 0) {
      return (
        <div className={styles.emptyState}>
          <FiInbox size={48} />
          <p>Немає доступних опитувань</p>
        </div>
      );
    }

    return (
      <table className={styles.surveysTable}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Назва</th>
            <th>Користувач</th>
            <th>Статус</th>
            <th>Винагорода</th>
            <th>Дія</th>
          </tr>
        </thead>
        <tbody>
          {surveys.map((s) => (
            <tr key={s.surveyId}>
              <td>{s.surveyId}</td>
              <td>{s.surveyName}</td>
              <td>{s.ownerId}</td>
              <td>{s.status}</td>
              <td>{s.reward}</td>
              <td>{renderActions(s)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderPassedSurveysTable = (surveys) => {
    if (surveys.length === 0) {
      return (
        <div className={styles.emptyState}>
          <FiCheckCircle size={48} />
          <p>Ви ще не пройшли жодного опитування</p>
        </div>
      );
    }

    return (
      <table className={styles.surveysTable}>
        <thead>
          <tr>
            <th>Назва</th>
            <th>Користувач</th>
            <th>Винагорода</th>
            <th>Час проходження (хв)</th>
          </tr>
        </thead>
        <tbody>
          {surveys.map((s) => (
            <tr key={s.surveyId}>
              <td>{s.surveyName}</td>
              <td>{s.ownerId}</td>
              <td>{s.reward}</td>
              <td>{s.completedDate || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderInvitationsTable = () => {
    if (invitations.length === 0) {
      return (
        <div className={styles.emptyState}>
          <FiInbox size={48} />
          <p>У вас немає нових запрошень</p>
        </div>
      );
    }

    return (
      <table className={styles.surveysTable}>
        <thead>
          <tr>
            <th>№</th>
            <th>Назва опитування</th>
            <th>Дата запрошення</th>
            <th>Дата проходження</th>
            <th>Бали</th>
            <th>Статус</th>
            <th>Дія</th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((inv) => (
            <tr key={inv.inviteId}>
              <td>{inv.inviteId}</td>
              <td>{inv.surveyName}</td>
              <td>{new Date(inv.inviteDate).toLocaleDateString()}</td>
              <td>{inv.passDate ? new Date(inv.passDate).toLocaleDateString() : "-"}</td>
              <td>{inv.reward}</td>
              <td>{inv.status}</td>
              <td>
                {inv.status === "invited" && inv.surveyStatus === "активный" && (
                  <button onClick={() => handleTakeSurvey(inv.surveyId)}>
                    <FiPlay size={14} /> Пройти
                  </button>
                )}
                {inv.status === "postponed" && inv.surveyStatus === "активный" && (
                  <button onClick={() => handleTakeSurvey(inv.surveyId)}>
                    <FiPlay size={14} /> Продовжити
                  </button>
                )}
                {inv.status === "пройден" && (
                  <button onClick={() => handleClaimReward(inv.surveyId, inv.reward)}>
                    Отримати винагороду
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderActions = (survey) => {
    const { surveyId, ownerId, status, reward } = survey;
    const isOwner = (ownerId === user.id);

    if (!isOwner && status === "активный") {
      return (
        <button onClick={() => handleTakeSurvey(surveyId)}>
          <FiPlay size={14} /> Пройти
        </button>
      );
    }
    if (!isOwner && status === "пройден") {
      return (
        <button onClick={() => handleClaimReward(surveyId, reward)}>
          Отримати винагороду
        </button>
      );
    }
    return (
      <div className={styles.actionButtons}>
        <button onClick={() => handlePreviewSurvey(surveyId)}>
          <FiEye size={14} /> Перегляд
        </button>
        {isOwner && status !== "завершён" && (
          <button onClick={() => handleEditSurvey(surveyId)}>
            <FiEdit size={14} /> Редагування
          </button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={styles.surveysContainer}>
        <h1>Завантаження опитувань...</h1>
      </div>
    );
  }

  return (
    <div className={styles.surveysContainer}>

      <div className={styles.topActions}>
        <button className={styles.createSurveyBtn} onClick={handleCreateSurvey}>
          <FiPlus size={18} /> Створити опитування
        </button>
      </div>

      <div className={styles.tabsRow}>
        <button
          className={activeTab === "invitation" ? "active" : ""}
          onClick={() => setActiveTab("invitation")}
        >
          Запрошення
        </button>
        <button
          className={activeTab === "passed" ? "active" : ""}
          onClick={() => setActiveTab("passed")}
        >
          Пройдені
        </button>
        <button
          className={activeTab === "mySurveys" ? "active" : ""}
          onClick={() => setActiveTab("mySurveys")}
        >
          Мої активні
        </button>
        <button
          className={activeTab === "drafts" ? "active" : ""}
          onClick={() => setActiveTab("drafts")}
        >
          Мої чернетки
        </button>
        <button
          className={activeTab === "finished" ? "active" : ""}
          onClick={() => setActiveTab("finished")}
        >
          Мої завершені
        </button>
      </div>

      {activeTab === "invitation" && (
        <div>
          <h2>Запрошення</h2>
          {renderInvitationsTable()}
        </div>
      )}

      {activeTab === "passed" && (
        <div>
          <h2>Пройдені</h2>
          {renderPassedSurveysTable(passedSurveys)}
        </div>
      )}

      {activeTab === "mySurveys" && (
        <div>
          <h2>Мої активні</h2>
          {renderSurveysTable(mySurveys)}
        </div>
      )}

      {activeTab === "drafts" && (
        <div>
          <h2>Мої чернетки</h2>
          {renderSurveysTable(draftSurveys)}
        </div>
      )}

      {activeTab === "finished" && (
        <div>
          <h2>Мої завершені</h2>
          {renderSurveysTable(finishedSurveys)}
        </div>
      )}
    </div>
  );
};

export default Surveys;