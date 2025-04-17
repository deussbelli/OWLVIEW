import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../utils/axiosConfig";
import styles from "../styles/SurveyPreview.module.css";

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
    <div className={styles.mediaContainer}>
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
        <div className={styles.imageContainer}>
          {images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt=""
              className={styles.mediaImage}
            />
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
          return (
            <button
              key={idx}
              onClick={() => handleClick(idx)}
              className={
                isActive
                  ? `${styles.q401Button} ${styles.q401ButtonActive}`
                  : styles.q401Button
              }
            >
              {val}
            </button>
          );
        })}
        {selectedIndex !== null && (
          <p className={styles.q401SelectedInfo}>
            Ви обрали: <strong>{items[selectedIndex]}</strong>
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
          return (
            <button
              key={idx}
              onClick={() => handleClick(idx)}
              className={
                isActive
                  ? `${styles.q402Button} ${styles.q402ButtonActive}`
                  : styles.q402Button
              }
            >
              {val}
            </button>
          );
        })}
        {selectedIndex !== null && (
          <p className={styles.q402SelectedInfo}>
            (<strong>{items[selectedIndex]}</strong>)
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
          Поточне значення: <strong>{items[sliderValue]}</strong>
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
          Обрано: <strong>{items[sliderValue]}</strong>
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
          const isActive = hoveredStar ? star <= hoveredStar : star <= selectedStar;
          return (
            <span
              key={star}
              onClick={() => handleClick(star)}
              onMouseEnter={() => handleMouseEnter(star)}
              onMouseLeave={handleMouseLeave}
              className={
                isActive
                  ? `${styles.starItem} ${styles.starItemActive}`
                  : `${styles.starItem} ${styles.starItemInactive}`
              }
            >
              ★
              {labels[star - 1] && (
                <div className={styles.starLabel}>{labels[star - 1]}</div>
              )}
            </span>
          );
        })}
      </div>
      {selectedStar > 0 && (
        <p className={styles.starSelectedInfo}>
          Ви обрали <strong>{selectedStar}</strong> з {count}
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
        <div
          key={sec.id || sIndex}
          className={styles.q104_105SectionBlock}
        >
          <p className={styles.q104_105SectionTitle}>
            Підпитання {sIndex + 1}: {sec.subQuestion}
          </p>
          {sec.answers?.map((ans, aIndex) => (
            <div
              key={ans.id || aIndex}
              className={styles.q104_105AnswerBlock}
            >
              <label>
                <input
                  type={isMultiple ? "checkbox" : "radio"}
                  name={`sec${sIndex}_${question.id}`}
                />
                {ans.text}
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
        <table className={`${styles.tableCommon}`}>
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

  if (rows.length > 0 && columns.length > 1) {
    const yesLabel = columns[0].text || "Так";
    const noLabel = columns[1].text || "Ні";
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

  const yesLabel = columns[0]?.text || "Да";
  const noLabel = columns[1]?.text || "Нет";

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
  const isMultiple = ["q504", "q506"].includes(type);

  return (
    <div className={styles.subTablesContainer}>
      {sections2.map((sec, idx) => {
        const rowCount = sec.rowCount || 0;
        const colCount = sec.colCount || 0;
        const tableData = sec.tableData || [];
        return (
          <div
            key={sec.id || idx}
            className={styles.subTableBlock}
          >
            <p className={styles.subQuestionTitle}>
              Підпитання {idx + 1}: {sec.subQuestion}
            </p>
            <div className={styles.tableWrapper}>
              <table className={styles.tableCommon}>
                <tbody>
                  {tableData.slice(0, rowCount).map((rowArr, rIndex) => (
                    <tr key={rIndex}>
                      {rowArr.slice(0, colCount).map((cellObj, cIndex) => {
                        const isHeaderRow =
                          (type === "q505" || type === "q506") && rIndex === 0;
                        if (isHeaderRow) {
                          return (
                            <td key={cIndex} className={styles.tableCell}>
                              <strong>{cellObj.text}</strong>
                              {renderMediaBlock(cellObj)}
                            </td>
                          );
                        } else {
                          return (
                            <td key={cIndex} className={styles.tableCell}>
                              <label className={styles.checkLabel}>
                                <input
                                  type={isOneAnswer ? "radio" : "checkbox"}
                                  name={`sec2_${idx}_row${rIndex}`}
                                  className={styles.checkInput}
                                />
                                {cellObj.text}
                              </label>
                              {renderMediaBlock(cellObj)}
                            </td>
                          );
                        }
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

  if (type === "q101" || type === "q201") {
    return (
      <div className={styles.q101Container}>
        {answers.map((ans, i) => (
          <div
            key={ans.id || i}
            className={styles.q101AnswerBlock}
          >
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

  if (type === "q102" || type === "q202") {
    return (
      <div className={styles.q102Container}>
        {answers.map((ans, i) => (
          <div
            key={ans.id || i}
            className={styles.q102AnswerBlock}
          >
            <label className={styles.q102AnswerLabel}>
              <input
                type="checkbox"
                name={`${question.id}_${ans.id}`}
              />
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

  if (type === "q301") {
    return (
      <div className={styles.q301Container}>
        <input
          type="number"
          className={styles.q301Input}
          placeholder="Введіть число"
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
          placeholder="Текст до 100 символів"
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
          placeholder="Текст до 300 символів"
        />
      </div>
    );
  }

  if (type === "q306") {
    return (
      <div className={styles.q306Container}>
        {(question.multiShortAnswers || []).map((_, idx) => (
          <div key={idx} className={styles.q306FieldBlock}>
            <input
              type="text"
              maxLength={50}
              className={styles.q306FieldInput}
              placeholder={`${idx + 1}`}
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

export default function SurveyPreview() {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(-1);

  function prepareQuestions(originalAnketa, answersShuffle) {
    const newAnketa = JSON.parse(JSON.stringify(originalAnketa));

    if (answersShuffle === "да") {
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

  useEffect(() => {
    const loadSurvey = async () => {
      try {
        const resp = await apiClient.get(`/surveys/${surveyId}`);
        if (resp.data.success) {
          const s = resp.data.survey;
          const { questions_shuffle, answers_shuffle, anketa = [] } = s;

          let anketaPrepared = anketa;
          if (questions_shuffle === "да") {
            anketaPrepared = shuffleArray(anketaPrepared);
          }

          anketaPrepared = prepareQuestions(anketaPrepared, answers_shuffle);

          const newSurvey = { ...s, anketa: anketaPrepared };
          setSurvey(newSurvey);
        }
      } catch (err) {
        console.error("Помилка при завантаженні:", err);
      }
    };
    if (surveyId) {
      loadSurvey();
    }
  }, [surveyId]);

  if (!survey) {
    return <div className={styles.container}>Завантаження...</div>;
  }

  const {
    survey_name,
    logo_link,
    description,
    anketa = [],
    display_mode = "single",
  } = survey;

  const goNext = () => {
    if (currentIndex < anketa.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (currentIndex === 0) {
      setCurrentIndex(-1);
    }
  };

  const goBack = () => {
    navigate(-1);
  };

  if (display_mode === "single") {
    return (
      <div className={`${styles.container} ${styles.singleModeContainer}`}>
        <div className={styles.header}>
          <h2 className={styles.surveyTitle}>Перегляд опитування:  <br /> {survey_name}</h2>
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
            <div className={styles.surveyDescription}>{description}</div>
          )}
        </div>

        {anketa.map((q, index) => (
          <div
            key={q.id}
            className={`${styles.singleQuestionContainer} ${styles.fadeInUpSurvey}`}
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
        ))}

        <div className={styles.singleButtonsContainer}>
          <button
            onClick={goBack}
            className={`${styles.button} ${styles.postponeButton}`}
          >
            Назад
          </button>
          <button
            onClick={() => alert("Опитування завершено!")}
            className={`${styles.button} ${styles.submitButton}`}
          >
            Завершити
          </button>
        </div>
      </div>
    );
  }

  if (currentIndex === -1) {
    return (
      <div className={`${styles.container} ${styles.multiModeContainer}`}>
        <h2 className={styles.surveyTitle}>Перегляд опитування: {survey_name}</h2>
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
          <div className={styles.surveyDescription}>{description}</div>
        )}

        <div className={styles.multiButtonsContainer}>
          <button
            onClick={goBack}
            className={`${styles.button} ${styles.prevButton}`}
          >
            Назад
          </button>
          <button
            onClick={() => setCurrentIndex(0)}
            className={`${styles.button} ${styles.startButton}`}
          >
            Почати
          </button>
        </div>
      </div>
    );
  }

  const question = anketa[currentIndex];
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === anketa.length - 1;

  return (
    <div className={`${styles.container} ${styles.multiModeContainer}`}>
      <div className={styles.multiQuestionBody}>
        <div className={styles.questionHeader}>
          Питання {currentIndex + 1} з {anketa.length}
        </div>
        {question.title && (
          <p className={styles.questionTitle}>{question.title}</p>
        )}
        {renderMediaBlock(question)}
        {renderQuestionContent(question)}
      </div>

      <div className={styles.multiButtonsContainer}>
        <button
          onClick={goBack}
          className={`${styles.button} ${styles.prevButton}`}
        >
          Назад до питань
        </button>

        <button
          onClick={goPrev}
          disabled={isFirstQuestion && currentIndex !== -1}
          className={`${styles.button} ${styles.prevButton}`}
        >
          Попередній
        </button>

        {!isLastQuestion ? (
          <button
            onClick={goNext}
            className={`${styles.button} ${styles.nextButton}`}
          >
            Наступний
          </button>
        ) : (
          <button
            onClick={() => alert("Опитування завершено!")}
            className={`${styles.button} ${styles.finishButton}`}
          >
            Завершити
          </button>
        )}
      </div>
    </div>
  );
}
