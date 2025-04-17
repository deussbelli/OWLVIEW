import React from "react";
import { renderQuestionUI } from "./SurveyPass";
import styles from "../styles/SurveyFilledPreview.module.css";

export default function SurveyFilledPreview({ anketa, userAnswers }) {
  if (!anketa || !Array.isArray(anketa)) return <div>Опитування не знайдено</div>;

  const noop = () => { };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Перегляд відповідей користувача</h1>
      {anketa.map((q, index) => (
        <div key={q.id} className={styles.questionCard}>
          <div className={styles.questionHeader}>
            <div className={styles.questionNumber}>
              Питання {index + 1} / {anketa.length} (тип: {q.type})
            </div>
            {q.title && (
              <h3 className={styles.questionTitle}>{q.title}</h3>
            )}
          </div>

          {q.videoLink && (
            <div className={styles.mediaContainer}>
              {renderVideo(q.videoLink)}
            </div>
          )}

          {q.audioLink && (
            <div className={styles.mediaContainer}>
              {renderAudio(q.audioLink)}
            </div>
          )}

          {q.images?.length > 0 && (
            <div className={styles.imageGallery}>
              {q.images.map((img, i2) => (
                <img
                  key={i2}
                  src={img}
                  alt=""
                />
              ))}
            </div>
          )}

          {renderQuestionUI(q, userAnswers[q.id] || {}, noop)}
        </div>
      ))}
    </div>
  );
}

function renderVideo(url) {
  if (!url) return null;
  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");

  if (isYouTube) {
    let embedUrl = url;
    if (url.includes("youtu.be")) {
      const parts = url.split("/");
      const id = parts[parts.length - 1];
      embedUrl = `https://www.youtube.com/embed/${id}`;
    } else if (url.includes("watch?v=")) {
      embedUrl = url.replace("watch?v=", "embed/");
    }
    return (
      <div className={styles.videoWrapper}>
        <iframe
          src={embedUrl}
          allowFullScreen
          title="YouTube Video"
        ></iframe>
      </div>
    );
  } else {
    return (
      <div className={styles.videoWrapper}>
        <video controls>
          <source src={url} type="video/mp4" />
          Ваш браузер не підтримує тег відео.
        </video>
      </div>
    );
  }
}

function renderAudio(url) {
  if (!url) return null;
  return (
    <div className={styles.audioWrapper}>
      <audio controls>
        <source src={url} type="audio/mpeg" />
        Ваш браузер не підтримує тег audio.
      </audio>
    </div>
  );
}