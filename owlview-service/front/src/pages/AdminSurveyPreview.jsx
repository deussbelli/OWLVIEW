import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../utils/axiosConfig";
import styles from "../styles/AdminSurveyPreview.module.css";

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderMediaBlock({ videoLink, audioLink, images }) {
  return (
    <div className={styles.mediaBlock}>
      {videoLink && (
        <div className={styles.videoContainer}>
          <video src={videoLink} controls className={styles.videoPlayer} />
        </div>
      )}
      {audioLink && (
        <div className={styles.audioContainer}>
          <audio src={audioLink} controls className={styles.audioPlayer} />
        </div>
      )}
      {images && images.length > 0 && (
        <div className={styles.imagesBlock}>
          {images.map((img, idx) => (
            <img key={idx} src={img} alt="" className={styles.imageItem} />
          ))}
        </div>
      )}
    </div>
  );
}


function GradientScalePreview({ question }) {
  const items = question.customScaleValues?.length
    ? question.customScaleValues
    : ["Light", "Medium", "Dark"];
  const [selectedIndex, setSelectedIndex] = useState(null);

  const handleClick = (idx) => {
    setSelectedIndex(idx);
  };

  if (question.type === "q401") {
    return (
      <div className={styles.q401Container}>
        {items.map((val, idx) => {
          const isActive = selectedIndex === idx;
          const btnClass = isActive
            ? `${styles.q401Button} ${styles.q401ButtonActive}`
            : styles.q401Button;

          return (
            <button
              key={idx}
              onClick={() => handleClick(idx)}
              className={btnClass}
            >
              {val}
            </button>
          );
        })}
        {selectedIndex !== null && (
          <p className={styles.q401SelectedInfo}>
            Вы выбрали: {items[selectedIndex]}
          </p>
        )}
      </div>
    );
  }

  if (question.type === "q402") {
    return (
      <div className={styles.q402Container}>
        {items.map((val, idx) => {
          const isActive = selectedIndex === idx;
          const btnClass = isActive
            ? `${styles.q402Button} ${styles.q402ButtonActive}`
            : styles.q402Button;

          return (
            <button
              key={idx}
              onClick={() => handleClick(idx)}
              className={btnClass}
            >
              {val}
            </button>
          );
        })}
        {selectedIndex !== null && (
          <p className={styles.q402SelectedInfo}>
            ({items[selectedIndex]})
          </p>
        )}
      </div>
    );
  }

  return null;
}

function SliderPreview({ question }) {
  const [sliderValue, setSliderValue] = useState(0);
  const items = question.customScaleValues?.length
    ? question.customScaleValues
    : ["1", "2", "3", "4", "5"];

  const handleChange = (e) => {
    setSliderValue(+e.target.value);
  };

  if (question.type === "q403") {
    return (
      <div className={styles.q403Container}>
        <input
          type="range"
          min={0}
          max={items.length - 1}
          value={sliderValue}
          onChange={handleChange}
          className={styles.q403Range}
        />
        <div className={styles.q403ScaleLabels}>
          {items.map((val, idx) => (
            <span key={idx} className={styles.q403ScaleLabel}>
              {val}
            </span>
          ))}
        </div>
        <p className={styles.q403SelectedValue}>
          Поточне значення: {items[sliderValue]}
        </p>
      </div>
    );
  }

  if (question.type === "q404") {
    return (
      <div className={styles.q404Container}>
        <input
          type="range"
          min={0}
          max={items.length - 1}
          value={sliderValue}
          onChange={handleChange}
          className={styles.q404RangeVertical}
        />
        <div className={styles.q404ScaleLabels}>
          {items.map((val, idx) => (
            <span key={idx} className={styles.q404ScaleLabel}>
              {val}
            </span>
          ))}
        </div>
        <p className={styles.q404SelectedValue}>
          Обрано: {items[sliderValue]}
        </p>
      </div>
    );
  }

  return null;
}

function StarRatingPreview({ question }) {
  const [hoveredStar, setHoveredStar] = useState(null);
  const [selectedStar, setSelectedStar] = useState(question.selectedStar || 0);

  const count = question.starsCount || 5;
  const labels = question.customScaleValues || [];

  const handleClick = (star) => setSelectedStar(star);
  const handleMouseEnter = (star) => setHoveredStar(star);
  const handleMouseLeave = () => setHoveredStar(null);

  const arr = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <div className={styles.starRatingContainer}>
      <div className={styles.starRow}>
        {arr.map((star) => {
          const isActive = hoveredStar
            ? star <= hoveredStar
            : star <= selectedStar;

          const starClass = isActive
            ? `${styles.starItem} ${styles.starItemActive}`
            : `${styles.starItem} ${styles.starItemInactive}`;

          return (
            <div
              key={star}
              className={starClass}
              onClick={() => handleClick(star)}
              onMouseEnter={() => handleMouseEnter(star)}
              onMouseLeave={handleMouseLeave}
            >
              ★
              {labels[star - 1] && (
                <div className={styles.starLabel}>{labels[star - 1]}</div>
              )}
            </div>
          );
        })}
      </div>
      {selectedStar > 0 && (
        <p className={styles.starSelectedInfo}>
          Ви обрали {selectedStar} з {count}
        </p>
      )}
    </div>
  );
}

function renderSectionsForQ104_Q105(question) {
  const isMultiple = question.type === "q105";
  const { sections = [] } = question;
  return (
    <div className={styles.q104_105Container}>
      {sections.map((sec, sIndex) => (
        <div key={sec.id || sIndex} className={styles.q104_105SectionBlock}>
          <p className={styles.q104_105SectionTitle}>
            Підпитання {sIndex + 1}: {sec.subQuestion}
          </p>
          {sec.answers?.map((ans, aIndex) => (
            <div key={ans.id || aIndex} className={styles.q104_105AnswerBlock}>
              <label>
                <input
                  type={isMultiple ? "checkbox" : "radio"}
                  name={`sec${sIndex}_${question.id}`}
                />
                &nbsp;{ans.text}
              </label>
              {renderMediaBlock(ans)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function renderTable_501(question) {
  const { rows = [], columns = [] } = question;
  if (rows.length > 0 && columns.length > 0) {
    return (
      <div className={styles.tableWrapper}>
        <table className={styles.tableCommon}>
          <thead>
            <tr>
              <th className={styles.tableHeaderEmptyCell}></th>
              {columns.map((col, cIndex) => (
                <th key={col.id || cIndex}>{col.text}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, rIndex) => (
              <tr key={r.id || rIndex}>
                <td className={styles.tableRowHeader}>{r.text}</td>
                {columns.map((c, cIndex) => (
                  <td key={c.id || cIndex} className={styles.tableCell}>
                    <input type="radio" name={`row${rIndex}_q501`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const rowCount = question.tableRowCount || 0;
  const colCount = question.tableColCount || 0;
  const tableData = question.tableData || [];
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.tableCommon}>
        <tbody>
          {tableData.slice(0, rowCount).map((rowArr, rIndex) => (
            <tr key={rIndex}>
              {rowArr.slice(0, colCount).map((cellVal, cIndex) => (
                <td key={cIndex} className={styles.tableCell}>
                  <div>{cellVal}</div>
                  <input type="radio" name={`row_${rIndex}_q501`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderTable_502(question) {
  const { rows = [], columns = [] } = question;
  if (rows.length > 0 && columns.length > 0) {
    return (
      <div className={styles.tableWrapper}>
        <table className={styles.tableCommon}>
          <thead>
            <tr>
              <th></th>
              {columns.map((col, cIndex) => (
                <th key={col.id || cIndex}>{col.text}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, rIndex) => (
              <tr key={r.id || rIndex}>
                <td className={styles.tableRowHeader}>{r.text}</td>
                {columns.map((c, cIndex) => (
                  <td key={c.id || cIndex} className={styles.tableCell}>
                    <input
                      type="checkbox"
                      name={`row${rIndex}_q502_col${cIndex}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const rowCount = question.tableRowCount || 0;
  const colCount = question.tableColCount || 0;
  const tableData = question.tableData || [];
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.tableCommon}>
        <tbody>
          {tableData.slice(0, rowCount).map((rowArr, rIndex) => (
            <tr key={rIndex}>
              {rowArr.slice(0, colCount).map((cellVal, cIndex) => (
                <td key={cIndex} className={styles.tableCell}>
                  <div>{cellVal}</div>
                  <input
                    type="checkbox"
                    name={`row_${rIndex}_q502_col${cIndex}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderTable_507(question) {
  const { rows = [], columns = [] } = question;
  const yesLabel = columns[0]?.text || "Да";
  const noLabel = columns[1]?.text || "Нет";

  if (rows.length > 0 && columns.length > 1) {
    return (
      <div className={styles.tableWrapper}>
        <table className={styles.tableCommon}>
          <thead>
            <tr>
              <th>Питання</th>
              <th>{yesLabel}</th>
              <th>{noLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, rIndex) => (
              <tr key={r.id || rIndex}>
                <td className={styles.tableRowHeader}>{r.text}</td>
                <td className={styles.tableCell}>
                  <input type="checkbox" />
                </td>
                <td className={styles.tableCell}>
                  <input type="checkbox" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const rowCount = question.tableRowCount || 0;
  const tableData = question.tableData || [];

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.tableCommon}>
        <thead>
          <tr>
            <th>Питання</th>
            <th>{yesLabel}</th>
            <th>{noLabel}</th>
          </tr>
        </thead>
        <tbody>
          {tableData.slice(0, rowCount).map((rowArr, rIndex) => {
            const questionText = rowArr[0] || "";
            return (
              <tr key={rIndex}>
                <td className={styles.tableRowHeader}>{questionText}</td>
                <td className={styles.tableCell}>
                  <input type="checkbox" />
                </td>
                <td className={styles.tableCell}>
                  <input type="checkbox" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function renderTable_503_506(question) {
  const { type, sections2 = [] } = question;
  const isOneAnswer = ["q503", "q505"].includes(type);

  return (
    <div className={styles.subTablesContainer}>
      {sections2.map((sec, idx) => {
        const rowCount = sec.rowCount || 0;
        const colCount = sec.colCount || 0;
        const tableData = sec.tableData || [];

        return (
          <div key={sec.id || idx} className={styles.subTableBlock}>
            <p className={styles.subQuestionTitle}>
              Підпитання {idx + 1}: {sec.subQuestion}
            </p>
            <table className={styles.tableCommon} style={{ marginTop: 5 }}>
              <tbody>
                {tableData.slice(0, rowCount).map((rowArr, rIndex) => (
                  <tr key={rIndex}>
                    {rowArr.slice(0, colCount).map((cellObj, cIndex) => {
                      return (
                        <td key={cIndex}>
                          <label>
                            <input
                              type={isOneAnswer ? "radio" : "checkbox"}
                              name={`sec2_${idx}_row${rIndex}`}
                            />
                            &nbsp;{cellObj.text}
                          </label>
                          {renderMediaBlock(cellObj)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function renderTables501_507(question) {
  const { type } = question;
  if (type === "q501") return renderTable_501(question);
  if (type === "q502") return renderTable_502(question);
  if (type === "q507") return renderTable_507(question);
  return renderTable_503_506(question);
}

function renderSimpleAnswers(question) {
  const { type, answers = [] } = question;

  if (type === "q101") {
    return (
      <div className={styles.q101Container}>
        {answers.map((ans, i) => (
          <div key={ans.id || i} className={styles.q101AnswerBlock}>
            <label className={styles.q101AnswerLabel}>
              <input type="radio" name={question.id} />
              {ans.text}
            </label>
            {renderMediaBlock(ans)}
          </div>
        ))}
      </div>
    );
  }

  if (type === "q102") {
    return (
      <div className={styles.q102Container}>
        {answers.map((ans, i) => (
          <div key={ans.id || i} className={styles.q102AnswerBlock}>
            <label className={styles.q102AnswerLabel}>
              <input type="checkbox" />
              {ans.text}
            </label>
            {renderMediaBlock(ans)}
          </div>
        ))}
      </div>
    );
  }

  if (type === "q103") {
    return (
      <div className={styles.q103Container}>
        <select className={styles.q103Select}>
          <option value="">— оберіть —</option>
          {answers.map((ans, i) => (
            <option key={ans.id || i} value={ans.text}>
              {ans.text}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (type === "q201") {
    return (
      <div className={styles.q201Container}>
        {answers.map((ans, i) => (
          <label
            key={ans.id || i}
            className={styles.q201AnswerBlock}
          >
            <input
              type="radio"
              name={`q201_${question.id}`}
              className={styles.q201HiddenRadio}
            />
            <div className={styles.q201AnswerText}>{ans.text}</div>
            {ans.images?.[0] && (
              <img
                src={ans.images[0]}
                alt=""
                className={styles.q201AnswerImage}
              />
            )}
          </label>
        ))}
      </div>
    );
  }

  if (type === "q202") {
    return (
      <div className={styles.q202Container}>
        {answers.map((ans, i) => (
          <label
            key={ans.id || i}
            className={styles.q202AnswerBlock}
          >
            <input
              type="checkbox"
              className={styles.q202HiddenCheckbox}
            />
            <div className={styles.q202AnswerText}>{ans.text}</div>
            {ans.images?.[0] && (
              <img
                src={ans.images[0]}
                alt=""
                className={styles.q202AnswerImage}
              />
            )}
          </label>
        ))}
      </div>
    );
  }

  if (type === "q301") {
    return (
      <div className={styles.q301Container}>
        <input
          type="number"
          className={styles.q301Input}
          placeholder="Уведіть число"
        />
      </div>
    );
  }
  if (type === "q302") {
    return (
      <div className={styles.q302Container}>
        <input
          type="text"
          className={styles.q302Input}
          placeholder="0.0"
        />
      </div>
    );
  }
  if (type === "q303") {
    return (
      <div className={styles.textareaContainer}>
        <input
          type="text"
          maxLength={50}
          className={styles.textareaCommon}
          placeholder="Короткий текст (до 50 симв.)"
        />
      </div>
    );
  }
  if (type === "q304") {
    return (
      <div className={styles.textareaContainer}>
        <textarea
          maxLength={100}
          rows={3}
          className={styles.textareaCommon}
          placeholder="Довгий текст (до 100 симв.)"
        />
      </div>
    );
  }
  if (type === "q305") {
    return (
      <div className={styles.textareaContainer}>
        <textarea
          maxLength={300}
          rows={5}
          className={styles.textareaCommon}
          placeholder="Довгий текст (до 300 симв.)"
        />
      </div>
    );
  }
  if (type === "q306") {
    return (
      <div className={styles.q306Container}>
        {(question.multiShortAnswers || []).map((_, idx) => (
          <div key={idx} className={styles.q306FieldBlock}>
            <label className={styles.q306FieldLabel}>
              Поле #{idx + 1}
            </label>
            <input
              type="text"
              maxLength={50}
              placeholder="Уведіть коротку відповідь"
              className={styles.q306FieldInput}
            />
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function renderQuestionContent(q) {
  const { type } = q;

  if (type === "q401" || type === "q402") {
    return <GradientScalePreview question={q} />;
  }
  if (type === "q403" || type === "q404") {
    return <SliderPreview question={q} />;
  }
  if (type === "q405") {
    return <StarRatingPreview question={q} />;
  }
  if (type === "q104" || type === "q105") {
    return renderSectionsForQ104_Q105(q);
  }
  if (["q501", "q502", "q503", "q504", "q505", "q506", "q507"].includes(type)) {
    return renderTables501_507(q);
  }
  return renderSimpleAnswers(q);
}

export default function AdminSurveyPreview() {
  const { surveyId } = useParams();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showDeletePanel, setShowDeletePanel] = useState(false);
  const [deleteChannel, setDeleteChannel] = useState("system");
  const [deleteSubject, setDeleteSubject] = useState("Видалення опитування");
  const [deleteMessage, setDeleteMessage] = useState("");

  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    loadSurvey();
  }, [surveyId]);

  async function loadSurvey() {
    try {
      setLoading(true);
      setError("");
      const resp = await apiClient.get(`/surveys/${surveyId}`);
      if (resp.data.success) {
        const s = resp.data.survey;
        let anketaPrepared = s.anketa || [];

        if (s.questions_shuffle === "так") {
          anketaPrepared = shuffleArray(anketaPrepared);
        }
        anketaPrepared = prepareQuestions(anketaPrepared, s.answers_shuffle);

        const newSurvey = { ...s, anketa: anketaPrepared };
        setSurvey(newSurvey);
        setCurrentIndex(-1);
      } else {
        setError(resp.data.message || "Помилка: опитування не знайдено");
      }
    } catch (err) {
      console.error(err);
      setError("Помилка під час завантаження опитування");
    } finally {
      setLoading(false);
    }
  }

  function prepareQuestions(originalAnketa, answersShuffle) {
    const newAnketa = JSON.parse(JSON.stringify(originalAnketa));
    if (answersShuffle === "так") {
      newAnketa.forEach((q) => {
        if (Array.isArray(q.answers) && q.answers.length > 1) {
          q.answers = shuffleArray(q.answers);
        }
        if (Array.isArray(q.rows) && q.rows.length > 1) {
          q.rows = shuffleArray(q.rows);
        }
        if (Array.isArray(q.columns) && q.columns.length > 1) {
          q.columns = shuffleArray(q.columns);
        }
        if (Array.isArray(q.sections)) {
          q.sections.forEach((sec) => {
            if (Array.isArray(sec.answers) && sec.answers.length > 1) {
              sec.answers = shuffleArray(sec.answers);
            }
          });
        }
        if (Array.isArray(q.sections2)) {
          q.sections2.forEach((sec) => {
            if (Array.isArray(sec.tableData) && sec.tableData.length > 1) {
              sec.tableData = shuffleArray(sec.tableData);
            }
          });
        }
        if (Array.isArray(q.tableData) && q.tableData.length > 1) {
          q.tableData = shuffleArray(q.tableData);
        }
      });
    }
    return newAnketa;
  }

  async function handleDeleteSurvey() {
    if (!deleteMessage.trim()) {
      alert("Введіть повідомлення!");
      return;
    }
    if (!survey) return;

    const body = {
      channel: deleteChannel,
      subject: deleteSubject,
      message: deleteMessage,
      owner_id: survey.owner_id,
    };
    try {
      setLoading(true);
      setError("");
      const res = await apiClient.post(
        `/admin/surveys/${surveyId}/delete-with-notification`,
        body,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("authToken")}`,
          },
        }
      );
      if (res.data.success) {
        alert("Опитування видалено, повідомлення надіслано.");
        navigate("/admin-user-surveys");
      } else {
        setError(res.data.message || "Помилка при видаленні");
      }
    } catch (err) {
      console.error(err);
      setError("Мережева помилка при видаленні");
    } finally {
      setLoading(false);
    }
  }

  const goNext = () => {
    if (!survey) return;
    const anketa = survey.anketa || [];
    if (currentIndex < anketa.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading) {
    return <div className={styles.loadingContainer}>Завантаження...</div>;
  }
  if (error) {
    return (
      <div className={styles.loadingContainer} style={{ color: "red" }}>
        {error}
      </div>
    );
  }
  if (!survey) {
    return <div className={styles.notFoundContainer}>Опитування не знайдено</div>;
  }

  const {
    survey_name,
    logo_link,
    description,
    anketa = [],
    display_mode = "single",
  } = survey;

  return (
    <div className={styles.surveyContainer}>
      <div className={styles.surveyOuterWrap}>
        <h2 className={styles.surveyTitle}>
          Перегляд опитування (для адміністраторів): {survey_name}
        </h2>

        <div style={{ margin: "10px 0" }}>
          <button
            className={styles.buttonDelete}
            onClick={() => setShowDeletePanel(!showDeletePanel)}
          >
            Видалити опитування
          </button>
        </div>

        {showDeletePanel && (
          <div className={styles.deletePanel}>
            <h3>Видалення опитування</h3>
            <label style={{ display: "block", marginBottom: 5 }}>
              Канал зв'язку:
              <select
                value={deleteChannel}
                onChange={(e) => setDeleteChannel(e.target.value)}
                style={{ marginLeft: 10 }}
              >
                <option value="system">система</option>
                <option value="email">пошта</option>
              </select>
            </label>
            <label style={{ display: "block", marginBottom: 5 }}>
              Тема:
              <input
                type="text"
                value={deleteSubject}
                onChange={(e) => setDeleteSubject(e.target.value)}
                style={{ marginLeft: 10, width: 300 }}
              />
            </label>
            <label style={{ display: "block", marginBottom: 5 }}>
              Повідомлення:
              <textarea
                value={deleteMessage}
                onChange={(e) => setDeleteMessage(e.target.value)}
                rows={3}
                style={{ marginLeft: 10, width: 300 }}
              />
            </label>
            <button className={styles.button} onClick={handleDeleteSurvey}>
              Надіслати
            </button>
          </div>
        )}

        {display_mode === "single" && (
          <div className={styles.singleModeContainer}>
            {logo_link && (
              <div className={styles.logoBlock}>
                <img
                  src={logo_link}
                  alt="logo"
                  className={styles.surveyLogo}
                />
              </div>
            )}
            {description && (
              <div className={styles.surveyDescription}>
                {description}
              </div>
            )}
            {anketa.map((q, index) => {
              return (
                <div
                  key={q.id || index}
                  className={styles.singleQuestionContainer}
                >
                  <div className={styles.questionHeader}>
                    Питання {index + 1}
                  </div>
                  {q.title && (
                    <p className={styles.questionTitle}>{q.title}</p>
                  )}
                  {renderMediaBlock(q)}
                  {renderQuestionContent(q)}
                </div>
              );
            })}
          </div>
        )}

        {display_mode === "multi" && (
          <div className={styles.multiModeContainer}>
            {currentIndex === -1 ? (
              <div>
                {logo_link && (
                  <div className={styles.logoBlock}>
                    <img
                      src={logo_link}
                      alt="logo"
                      className={styles.surveyLogo}
                    />
                  </div>
                )}
                {description && (
                  <div className={styles.surveyDescription}>
                    {description}
                  </div>
                )}
                <button
                  className={styles.startButton}
                  onClick={() => setCurrentIndex(0)}
                >
                  Почати
                </button>
              </div>
            ) : currentIndex < anketa.length ? (
              <div className={styles.multiQuestionBody}>
                <div className={styles.questionHeader}>
                  Питання {currentIndex + 1} из {anketa.length} (тип:{" "}
                  {anketa[currentIndex].type})
                </div>
                {anketa[currentIndex].title && (
                  <p className={styles.questionTitle}>
                    {anketa[currentIndex].title}
                  </p>
                )}
                {renderMediaBlock(anketa[currentIndex])}
                {renderQuestionContent(anketa[currentIndex])}

                <div className={styles.multiButtonsContainer}>
                  <button
                    className={styles.prevButton}
                    onClick={goPrev}
                    disabled={currentIndex <= 0}
                  >
                    Назад
                  </button>
                  {currentIndex < anketa.length - 1 ? (
                    <button className={styles.nextButton} onClick={goNext}>
                      Далі
                    </button>
                  ) : (
                    <button
                      className={styles.finishButton}
                      onClick={() => alert("Это был последний вопрос!")}
                    >
                      Завершити
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.finishedMessage}>
                Це було останнє питання!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
