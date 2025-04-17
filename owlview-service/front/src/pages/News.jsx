import React, { useState, useEffect } from "react";
import apiClient from "../utils/axiosConfig";
import styles from "../styles/News.module.css";

const News = ({ user }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("admin");
  const [sourceUrl, setSourceUrl] = useState("");

  const isAdmin = user?.role === "admin";

  const fetchNews = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/news", {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("authToken")}`,
        },
      });
      if (res.data.success) {
        setNews(res.data.news);
      } else {
        setError(res.data.message || "Помилка при завантаженні новин");
      }
    } catch (err) {
      console.error("Помилка при завантаженні новин:", err);
      setError("Помилка при завантаженні новин");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNewsFromSource = async (source, pages = 1) => {
    if (!window.confirm(`Ви дійсно хочете підтягнути новини з ${source}?`)) return;

    try {
      setLoading(true);
      const res = await apiClient.post("/news/fetch",
        { source, pages },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("authToken")}`,
          },
        }
      );

      if (res.data.success) {
        alert(`Підтягнуто ${res.data.count} новин з ${source}`);
        fetchNews();
      } else {
        setError(res.data.message || `Помилка при підтягуванні новин з ${source}`);
      }
    } catch (err) {
      console.error(`Помилка при підтягуванні новин із ${source}:`, err);
      setError(`Помилка при підтягуванні новин із ${source}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNews = async () => {
    if (!title || !content) {
      alert("Заповніть всі обов'язкові поля: Заголовок та Текст новини");
      return;
    }

    try {
      setLoading(true);
      const newsData = {
        title,
        content,
        source: "admin",
        source_url: ""
      };

      const res = await apiClient.post("/news",
        newsData,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("authToken")}`,
          },
        }
      );

      if (res.data.success) {
        alert("Новину успішно додано!");
        setTitle("");
        setContent("");
        setShowAddForm(false);
        fetchNews();
      }
      else {
        setError(res.data.message || "Помилка при додаванні новини");
      }
    }
    catch (err) {
      console.error("Помилка при додаванні новини:", err);
      setError("Помилка при додаванні новини");
    }
    finally {
      setLoading(false);
    }
  };

  const handleDeleteNews = async (id) => {
    if (!window.confirm("Ви впевнені, що бажаєте видалити цю новину?")) return;

    try {
      setLoading(true);
      const res = await apiClient.delete(`/news/${id}`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("authToken")}`,
        },
      });

      if (res.data.success) {
        alert("Новина успішно видалена!");
        fetchNews();
      } else {
        setError(res.data.message || "Помилка видалення новини");
      }
    } catch (err) {
      console.error("Помилка при видаленні новини:", err);
      setError("Помилка при видаленні новини");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={styles.newsContainer}>
      <h2>Новини</h2>
      {error && <div className={styles.error}>{error}</div>}
      {loading && <div className={styles.loading}>Завантаження...</div>}

      {isAdmin && (
        <div className={styles.adminControls}>
          <button
            onClick={() => fetchNewsFromSource("pravda", 100)}
            className={styles.fetchButton}
            disabled={loading}
          >
            Підтягнути новини з УП
          </button>
          <button
            onClick={() => fetchNewsFromSource("ukrinform")}
            className={styles.fetchButton}
            disabled={loading}
          >
            Підтягнути новини з УкрІнформ
          </button>
          <button
            onClick={() => fetchNewsFromSource("suspilne")}
            className={styles.fetchButton}
            disabled={loading}
          >
            Підтягнути новини з Суспільне Новини
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={styles.addButton}
            disabled={loading}
          >
            {showAddForm ? "Скасувати" : "Додати новину"}
          </button>
        </div>
      )}

      {isAdmin && showAddForm && (
        <div className={styles.addNewsForm}>
          <h3>Додати новину</h3>
          <div>
            <label>Заголовок:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Уведіть заголовок новини"
              disabled={loading}
            />
          </div>

          <div>
            <label>Текст новини:</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Уведіть текст новини"
              rows={5}
              disabled={loading}
            />
          </div>

          <button
            onClick={handleAddNews}
            disabled={loading}
            className={loading ? styles.disabledButton : ""}
          >
            {loading ? "Збереження..." : "Зберегити"}
          </button>
        </div>
      )}

      <div className={styles.newsList}>
        {news.length === 0 && !loading && (
          <div className={styles.noNews}>Новини відсутні</div>
        )}

        {news.map((item) => (
          <div key={item.id} className={styles.newsItem}>
            <h3 className={styles.newsTitle}>{item.title}</h3>
            <div className={styles.newsContent}>{item.content}</div>

            <div className={styles.newsInfo}>
              <span className={styles.newsDate}>{formatDate(item.published_at)}</span>

              {item.source !== "admin" && (
                <>
                  <span className={styles.newsDivider}>|</span>
                  <span className={styles.newsSource}>
                    Джерело:ㅤ
                    {item.source_url ? (
                      <a href={item.source_url} target="_blank" rel="noopener noreferrer">
                        {item.source}
                      </a>
                    ) : (
                      item.source
                    )}
                  </span>
                </>
              )}
            </div>

            {isAdmin && (
              <button
                onClick={() => handleDeleteNews(item.id)}
                className={styles.deleteButton}
                disabled={loading}
              >
                Видатили
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default News;