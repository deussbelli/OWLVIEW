import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "../utils/axiosConfig";
import AnalyticsTab from "./AnalyticsTab";
import ArtificialIntelligenceTab from "./ArtificialIntelligenceTab";
import SurveyAnswersPage from "./SurveyAnswersPage";
import styles from "../styles/SurveyEditor.module.css";
import { FaVideo, FaMicrophone, FaImage, FaSave, FaTimes, FaTrash, FaCopy } from "react-icons/fa";

const questionInstructions = {
  q101: "Можна вибрати лише одну відповідь (чекбокси).",
  q102: "Можна вибрати кілька відповідей (чекбокси).",
  q103: "Випадаючий список (одна відповідь).",
  q104: "Розділи, одна відповідь у кожному розділі.",
  q105: "Розділи, кілька відповідей у ​​кожному розділі.",
  q201: "Можна завантажити кілька зображень, вибрати лише одне.",
  q202: "Можна завантажити кілька зображень, вибрати кілька.",
  q301: "Коротке поле для введення лише цифр (без пропусків).",
  q302: "Коротке поле для введення дробу (через точку).",
  q303: "Коротке текстове поле (до 50 символів).",
  q304: "Довге текстове поле (до 100 символів).",
  q305: "Довге текстове поле (до 300 символів).",
  q306: "Кілька коротких текстових полів (до 50 символів кожне).",
  q401: "Вертикальна шкала з кнопок (можна задати свої мітки).",
  q402: "Горизонтальна шкала з кнопок (можна задати свої мітки).",
  q403: "Горизонтальний слайдер з підписами користувача.",
  q404: "Вертикальний слайдер з підписами користувача.",
  q405: "Бальна шкала (горизонтальна) з кнопками-зірочками.",
  q501: "Таблиця, в одному рядку можна вибрати 1 відповідь.",
  q502: "Таблиця, в одному рядку можна вибрати кілька відповідей.",
  q503: "РОЗДІЛ: підпитання + таблиця (1 відповідь у таблиці).",
  q504: "РОЗДІЛ: підпитання + таблиця (кілька відповідей).",
  q505: "Таблиця-карусель (кілька відповідей).",
  q506: "Таблиця-карусель (1 відповідь).",
  q507: "Таблиця з 3 стовпців: Питання, так/ні."
};

function getQuestionTypeInstruction(type) {
  return questionInstructions[type] || "";
}

function QuestionBlock({ question, onSave, onDelete, onDuplicate }) {
  const [editMode, setEditMode] = useState(true);

  useEffect(() => {
    if (question.saved) setEditMode(false);
  }, [question.saved]);

  return (
    <QuestionBlockNew
      question={question}
      editMode={editMode}
      setEditMode={setEditMode}
      onSave={onSave}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
    />
  );
}

function renderMediaPreview(url, mediaType) {
  if (!url) return null;
  if (mediaType === "video") {
    return (
      <div style={{ marginTop: 5 }}>
        <video src={url} controls style={{ maxWidth: 300 }} />
      </div>
    );
  }
  if (mediaType === "audio") {
    return (
      <div style={{ marginTop: 5 }}>
        <audio src={url} controls />
      </div>
    );
  }
  return null;
}

function handleMediaPrompt(label, oldLink = "") {
  const link = prompt(label, oldLink);
  return link || "";
}

function QuestionBlockNew({
  question,
  editMode,
  setEditMode,
  onSave,
  onDelete,
  onDuplicate
}) {
  const [title, setTitle] = useState(question.title || "");
  const [videoLink, setVideoLink] = useState(question.videoLink || "");
  const [audioLink, setAudioLink] = useState(question.audioLink || "");
  const [images, setImages] = useState(question.images || []);
  const [answers, setAnswers] = useState(question.answers || []);
  const [rows, setRows] = useState(question.rows || []);
  const [columns, setColumns] = useState(question.columns || []);
  const [sections, setSections] = useState(question.sections || []);
  const [starsCount, setStarsCount] = useState(question.starsCount || 10);
  const [selectedStar, setSelectedStar] = useState(question.selectedStar || 0);
  const [scaleMinLabel, setScaleMinLabel] = useState(question.scaleMinLabel || "");
  const [scaleMaxLabel, setScaleMaxLabel] = useState(question.scaleMaxLabel || "");
  const [customScaleValues, setCustomScaleValues] = useState(
    question.customScaleValues || []
  );
  const [multiShortAnswers, setMultiShortAnswers] = useState(
    question.multiShortAnswers || []
  );
  const [numericValue, setNumericValue] = useState(question.numericValue || "");
  const [tableRowCount, setTableRowCount] = useState(question.tableRowCount || 0);
  const [tableColCount, setTableColCount] = useState(question.tableColCount || 0);
  const [tableData, setTableData] = useState(question.tableData || []);
  const [sections2, setSections2] = useState(question.sections2 || []);

  const [showBatchModalAnswers, setShowBatchModalAnswers] = useState(false);
  const [batchTextAnswers, setBatchTextAnswers] = useState("");

  const [showScaleModal, setShowScaleModal] = useState(false);
  const [scaleModalText, setScaleModalText] = useState("");

  const handleSave = () => {
    onSave({
      title,
      videoLink,
      audioLink,
      images,
      answers,
      rows,
      columns,
      sections,
      starsCount,
      selectedStar,
      scaleMinLabel,
      scaleMaxLabel,
      customScaleValues,
      multiShortAnswers,
      numericValue,
      tableRowCount,
      tableColCount,
      tableData,
      sections2
    });
    setEditMode(false);
  };

  const handleCancel = () => {
    setTitle(question.title || "");
    setVideoLink(question.videoLink || "");
    setAudioLink(question.audioLink || "");
    setImages(question.images || []);
    setAnswers(question.answers || []);
    setRows(question.rows || []);
    setColumns(question.columns || []);
    setSections(question.sections || []);
    setStarsCount(question.starsCount || 10);
    setSelectedStar(question.selectedStar || 0);
    setScaleMinLabel(question.scaleMinLabel || "");
    setScaleMaxLabel(question.scaleMaxLabel || "");
    setCustomScaleValues(question.customScaleValues || []);
    setMultiShortAnswers(question.multiShortAnswers || []);
    setNumericValue(question.numericValue || "");
    setTableRowCount(question.tableRowCount || 0);
    setTableColCount(question.tableColCount || 0);
    setTableData(question.tableData || []);
    setSections2(question.sections2 || []);
    setEditMode(false);
  };

  const handleAddVideoQ = () => {
    const link = handleMediaPrompt("Введіть посилання на відео", videoLink);
    if (link) setVideoLink(link);
  };
  const handleAddAudioQ = () => {
    const link = handleMediaPrompt("Введіть посилання на аудіо (mp3)", audioLink);
    if (link) setAudioLink(link);
  };
  const handleAddImageQ = () => {
    const link = handleMediaPrompt("Введіть посилання на зображення");
    if (link && !images.includes(link)) setImages([...images, link]);
  };

  const handleAddAnswer = () => {
    setAnswers((prev) => [
      ...prev,
      { id: "ans" + Date.now(), text: "", videoLink: "", audioLink: "", images: [] }
    ]);
  };
  const handleDeleteAnswer = (index) => {
    setAnswers((prev) => prev.filter((_, i) => i !== index));
  };
  const handleAnswerChange = (index, field, value) => {
    setAnswers((prev) => prev.map((ans, i) => (i === index ? { ...ans, [field]: value } : ans)));
  };
  const handleAnswerMedia = (index, media) => {
    const oldVal = answers[index]?.[media + "Link"] || "";
    const label = media === "video"
      ? "Посилання на відео"
      : media === "audio"
        ? "Посилання на аудіо (mp3)"
        : "Посилання на картинку";
    const link = handleMediaPrompt(label, oldVal);
    if (!link) return;
    setAnswers((prev) => {
      const copy = [...prev];
      if (media === "image") {
        if (!copy[index].images.includes(link)) {
          copy[index].images = [...(copy[index].images || []), link];
        }
      } else {
        copy[index][media + "Link"] = link;
      }
      return copy;
    });
  };

  const handleBatchAddAnswers = () => setShowBatchModalAnswers(true);
  const handleBatchAnswersConfirm = () => {
    const lines = batchTextAnswers.split("\n").map((l) => l.trim()).filter((l) => l);
    const newAnswers = lines.map((txt) => ({
      id: "ans" + Date.now() + "_" + Math.random(),
      text: txt,
      videoLink: "",
      audioLink: "",
      images: []
    }));
    setAnswers((prev) => [...prev, ...newAnswers]);
    setShowBatchModalAnswers(false);
    setBatchTextAnswers("");
  };
  const handleBatchAnswersCancel = () => {
    setShowBatchModalAnswers(false);
    setBatchTextAnswers("");
  };

  const handleAddSection = () => {
    setSections((prev) => [
      ...prev,
      { id: "sec" + Date.now(), subQuestion: "", answers: [] }
    ]);
  };
  const handleDeleteSection = (secIndex) => {
    setSections((prev) => prev.filter((_, i) => i !== secIndex));
  };
  const handleSectionChange = (secIndex, field, value) => {
    setSections((prev) =>
      prev.map((sec, i) => (i === secIndex ? { ...sec, [field]: value } : sec))
    );
  };
  const handleAddAnswerToSection = (secIndex) => {
    setSections((prev) =>
      prev.map((sec, i) =>
        i === secIndex
          ? {
            ...sec,
            answers: [
              ...(sec.answers || []),
              { id: "ans" + Date.now(), text: "", videoLink: "", audioLink: "", images: [] }
            ]
          }
          : sec
      )
    );
  };
  const handleDeleteAnswerFromSection = (secIndex, aIndex) => {
    setSections((prev) =>
      prev.map((sec, i) =>
        i === secIndex
          ? { ...sec, answers: sec.answers.filter((_, j) => j !== aIndex) }
          : sec
      )
    );
  };
  const handleSectionAnswerChange = (secIndex, aIndex, field, value) => {
    setSections((prev) =>
      prev.map((sec, i) =>
        i === secIndex
          ? {
            ...sec,
            answers: sec.answers.map((ans, j) =>
              j === aIndex ? { ...ans, [field]: value } : ans
            )
          }
          : sec
      )
    );
  };
  const handleSectionAnswerMedia = (secIndex, aIndex, media) => {
    const link = handleMediaPrompt(
      media === "video" ? "Посилання на відео" :
        media === "audio" ? "Посилання на аудіо (mp3)" :
          "Посилання на зображення"
    );
    if (!link) return;
    setSections((prev) =>
      prev.map((sec, i) =>
        i === secIndex
          ? {
            ...sec,
            answers: sec.answers.map((ans, j) => {
              if (j !== aIndex) return ans;
              if (media === "image") {
                return { ...ans, images: [...new Set([...(ans.images || []), link])] };
              } else {
                return { ...ans, [media + "Link"]: link };
              }
            })
          }
          : sec
      )
    );
  };

  const handleOpenScaleModal = () => {
    setScaleModalText(customScaleValues.join("\n"));
    setShowScaleModal(true);
  };
  const handleScaleModalConfirm = () => {
    const lines = scaleModalText.split("\n").map((l) => l.trim()).filter((l) => l);
    setCustomScaleValues(lines);
    setShowScaleModal(false);
  };
  const handleScaleModalCancel = () => setShowScaleModal(false);

  const handleAddSection2 = () => {
    let maxR = 20, maxC = 10;
    if (["q503", "q504"].includes(question.type)) maxR = 2;
    if (["q503", "q504"].includes(question.type)) maxC = 10;
    if (["q505", "q506"].includes(question.type)) maxR = 10;
    if (["q505", "q506"].includes(question.type)) maxC = 1;
    setSections2((prev) => [
      ...prev,
      {
        id: "sec2" + Date.now(),
        subQuestion: "",
        rowCount: 0,
        colCount: 0,
        tableData: [],
        maxR,
        maxC
      }
    ]);
  };
  const handleDeleteSection2 = (secIndex) => {
    setSections2((prev) => prev.filter((_, i) => i !== secIndex));
  };
  const handleSection2Change = (secIndex, field, value) => {
    setSections2((prev) =>
      prev.map((sec, i) => (i === secIndex ? { ...sec, [field]: value } : sec))
    );
  };
  const handleSetSection2TableSize = (secIndex) => {
    setSections2((prev) => {
      const copy = [...prev];
      let sec = { ...copy[secIndex] };
      const input = prompt(
        `Введіть розміри (рядки x стовпці), max: ${sec.maxR}x${sec.maxC}`,
        `${sec.rowCount}x${sec.colCount}`
      );
      if (!input) return copy;
      const match = input.match(/^(\d+)x(\d+)$/);
      if (!match) {
        alert("Неправильний формат. Вкажіть, наприклад: 3x4");
        return copy;
      }
      let rc = parseInt(match[1], 10);
      let cc = parseInt(match[2], 10);
      if (rc > sec.maxR) rc = sec.maxR;
      if (cc > sec.maxC) cc = sec.maxC;
      sec.rowCount = rc;
      sec.colCount = cc;

      let tData = [...(sec.tableData || [])];
      if (tData.length < rc) for (let i = tData.length; i < rc; i++) tData.push([]);
      else if (tData.length > rc) tData = tData.slice(0, rc);

      tData = tData.map((r) => {
        const rowCopy = [...r];
        if (rowCopy.length < cc) {
          for (let j = rowCopy.length; j < cc; j++) {
            rowCopy.push({ text: "", videoLink: "", audioLink: "", images: [] });
          }
        } else if (rowCopy.length > cc) {
          return rowCopy.slice(0, cc);
        }
        return rowCopy;
      });
      sec.tableData = tData;
      copy[secIndex] = sec;
      return copy;
    });
  };
  const handleChangeSection2TableCell = (secIndex, rIndex, cIndex, field, value) => {
    setSections2((prev) => {
      const copy = [...prev];
      const sec = { ...copy[secIndex] };
      const rowsArr = [...sec.tableData];
      const rowCopy = [...rowsArr[rIndex]];
      rowCopy[cIndex] = { ...rowCopy[cIndex], [field]: value };
      rowsArr[rIndex] = rowCopy;
      sec.tableData = rowsArr;
      copy[secIndex] = sec;
      return copy;
    });
  };
  const handleSection2CellAddMedia = (secIndex, rIndex, cIndex, mediaType) => {
    const link = handleMediaPrompt(
      mediaType === "video"
        ? "Посилання на відео"
        : mediaType === "audio"
          ? "Посилання на аудіо (mp3)"
          : "Посилання на картинку"
    );
    if (!link) return;
    setSections2((prev) => {
      const copy = [...prev];
      const sec = { ...copy[secIndex] };
      const rowsArr = [...sec.tableData];
      const rowCopy = [...rowsArr[rIndex]];
      let cell = { ...rowCopy[cIndex] };
      if (mediaType === "video") cell.videoLink = link;
      else if (mediaType === "audio") cell.audioLink = link;
      else if (mediaType === "image") {
        if (!cell.images.includes(link)) cell.images.push(link);
      }
      rowCopy[cIndex] = cell;
      rowsArr[rIndex] = rowCopy;
      sec.tableData = rowsArr;
      copy[secIndex] = sec;
      return copy;
    });
  };
  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      { id: "row" + Date.now(), text: "", videoLink: "", audioLink: "", images: [] }
    ]);
  };
  const handleDeleteRow = (rIndex) => setRows((prev) => prev.filter((_, i) => i !== rIndex));
  const handleRowChange = (rIndex, field, value) => {
    setRows((prev) => prev.map((row, i) => (i === rIndex ? { ...row, [field]: value } : row)));
  };
  const handleRowMedia = (rIndex, media) => {
    const link = handleMediaPrompt(
      media === "video"
        ? "Посилання на відео"
        : media === "audio"
          ? "Посилання на аудіо (mp3)"
          : "Посилання на картинку"
    );
    if (!link) return;
    setRows((prev) => {
      const copy = [...prev];
      if (media === "image") {
        const arr = copy[rIndex].images || [];
        if (!arr.includes(link)) arr.push(link);
        copy[rIndex].images = arr;
      } else {
        copy[rIndex][media + "Link"] = link;
      }
      return copy;
    });
  };

  const handleAddColumn = () => {
    setColumns((prev) => [
      ...prev,
      { id: "col" + Date.now(), text: "", videoLink: "", audioLink: "", images: [] }
    ]);
  };
  const handleDeleteColumn = (cIndex) => setColumns((prev) => prev.filter((_, i) => i !== cIndex));
  const handleColChange = (cIndex, field, value) => {
    setColumns((prev) =>
      prev.map((col, i) => (i === cIndex ? { ...col, [field]: value } : col))
    );
  };
  const handleColMedia = (cIndex, media) => {
    const link = handleMediaPrompt(
      media === "video"
        ? "Посилання на відео"
        : media === "audio"
          ? "Посилання на аудіо (mp3)"
          : "Посилання на картинку"
    );
    if (!link) return;
    setColumns((prev) => {
      const copy = [...prev];
      if (media === "image") {
        const arr = copy[cIndex].images || [];
        if (!arr.includes(link)) arr.push(link);
        copy[cIndex].images = arr;
      } else {
        copy[cIndex][media + "Link"] = link;
      }
      return copy;
    });
  };

  const renderScalePreview = () => {
    const items = customScaleValues.length > 0 ? customScaleValues : ["1", "2", "3", "4", "5"];
    if (question.type === "q401") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {items.map((val, idx) => (
            <button key={idx} style={{ color: "#fff", border: "1px solid #ccc" }}>
              {val}
            </button>
          ))}
        </div>
      );
    }
    if (question.type === "q402") {
      return (
        <div style={{ display: "flex", flexDirection: "row", gap: "4px" }}>
          {items.map((val, idx) => (
            <button key={idx} style={{ color: "#fff", border: "1px solid #ccc" }}>
              {val}
            </button>
          ))}
        </div>
      );
    }
    if (question.type === "q403") {
      return (
        <div style={{ width: "300px", position: "relative", margin: "20px 0" }}>
          <input type="range" min={0} max={items.length - 1} style={{ width: "100%" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {items.map((val, idx) => (
              <span key={idx}>{val}</span>
            ))}
          </div>
        </div>
      );
    }
    if (question.type === "q404") {
      return (
        <div style={{ display: "flex", alignItems: "center", height: "180px", marginTop: "20px" }}>
          <input
            type="range"
            min={0}
            max={items.length - 1}
            style={{ writingMode: "vertical-rl", width: "50px", height: "150px" }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              height: "150px"
            }}
          >
            {items.map((val, idx) => (
              <span key={idx}>{val}</span>
            ))}
          </div>
        </div>
      );
    }
    if (question.type === "q405") {
      const starArray = Array.from({ length: starsCount }, (_, i) => i + 1);
      return (
        <div style={{ display: "flex", alignItems: "center" }}>
          {starArray.map((star, idx) => (
            <div key={star} style={{ textAlign: "center", marginRight: 10 }}>
              <div style={{ fontSize: "1.5em" }}>{star <= selectedStar ? "★" : "☆"}</div>
              {customScaleValues[idx] && (
                <div style={{ fontSize: "0.8em" }}>{customScaleValues[idx]}</div>
              )}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!editMode) {
    return (
      <div className={styles.questionBlock}>
        <div className={styles.questionHeader}>
          <h4>Питання {question.id}</h4>
          {/* <span className={styles.questionTypeBadge}>тип: {question.type}</span> */}
        </div>
        <p className={styles.questionInstruction}>
          {getQuestionTypeInstruction(question.type)}
        </p>

        <div className={styles.questionContent}>
          <p className={styles.questionTitle}>{title}</p>
          <div className={styles.mediaPreviews}>
            {videoLink && renderMediaPreview(videoLink, "video")}
            {audioLink && renderMediaPreview(audioLink, "audio")}
            {images?.length > 0 && (
              <div className={styles.mediaPreviews}>
                {images
                  .filter((img) => typeof img === "string" && img.startsWith("http"))
                  .map((img, idx) => (
                    <div key={idx} className={styles.imageContainer}>
                      <img src={img} alt={`img-${idx}`} />
                    </div>
                  ))}
              </div>
            )}
          </div>

          {["q101", "q102", "q103", "q201", "q202"].includes(question.type) && (
            <div className={styles.answerOptions}>
              <p className={styles.answerOptionsTitle}>Варіанти відповідей:</p>
              {answers.map((ans, i) => (
                <div key={ans.id || i} className={styles.answerOption}>
                  <span className={styles.answerText}>- {ans.text}</span>
                  {ans.videoLink && renderMediaPreview(ans.videoLink, "video")}
                  {ans.audioLink && renderMediaPreview(ans.audioLink, "audio")}
                  {ans.images?.length > 0 && (
                    <div className={styles.answerImages}>
                      {ans.images.map((img2, i2) => (
                        <div key={i2} className={styles.imageContainer}>
                          <img src={img2} alt="" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {question.type === "q301" && (
            <p className={styles.numericAnswer}>Введене число: {numericValue}</p>
          )}
          {question.type === "q302" && (
            <p className={styles.numericAnswer}>Введений дріб (через крапку): {numericValue}</p>
          )}

          {question.type === "q303" && (
            <p className={styles.textAnswer}>Короткий текст: {answers[0]?.text}</p>
          )}
          {question.type === "q304" && (
            <p className={styles.textAnswer}>Довгий текст (100): {answers[0]?.text}</p>
          )}
          {question.type === "q305" && (
            <p className={styles.textAnswer}>Довгий текст (300): {answers[0]?.text}</p>
          )}

          {question.type === "q306" && (
            <div className={styles.multiShortAnswers}>
              <p>Кілька коротких полів:</p>
              {multiShortAnswers.map((val, idx) => (
                <div key={idx} className={styles.multiShortAnswer}>
                  {idx + 1}: {val}
                </div>
              ))}
            </div>
          )}
          {["q401", "q402", "q403", "q404", "q405"].includes(question.type) && (
            <div className={styles.scalePreview}>
              {renderScalePreview()}
            </div>
          )}
          {["q104", "q105"].includes(question.type) && (
            <div className={styles.sectionsContainer}>
              <p className={styles.sectionsTitle}>Секції:</p>
              {sections.map((sec, idx) => (
                <div key={sec.id || idx} className={styles.sectionItem}>
                  <div className={styles.sectionHeader}>
                    <strong>Підпитання {idx + 1}:</strong> {sec.subQuestion}
                  </div>
                  <div className={styles.sectionAnswers}>
                    {sec.answers?.map((ans, aIndex) => (
                      <div key={ans.id || aIndex} className={styles.sectionAnswer}>
                        <span className={styles.answerText}>- {ans.text}</span>
                        {ans.videoLink && renderMediaPreview(ans.videoLink, "video")}
                        {ans.audioLink && renderMediaPreview(ans.audioLink, "audio")}
                        {ans.images?.length > 0 && (
                          <div className={styles.answerImages}>
                            {ans.images.map((im, k) => (
                              <img
                                key={k}
                                src={im}
                                alt=""
                                className={styles.answerImage}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {["q501", "q502", "q503", "q504", "q505", "q506", "q507"].includes(question.type) && (
            <div className={styles.tableContainer}>
              <table className={styles.previewTable}>
                <tbody>
                  {tableData.slice(0, tableRowCount).map((rowArr, rIndex) => (
                    <tr key={rIndex}>
                      {rowArr.slice(0, question.type === "q507" ? 3 : tableColCount).map((cell, cIndex) => (
                        <td key={cIndex}>
                          {question.type === "q507" && (cIndex === 1 || cIndex === 2)
                            ? "[так/ні]"
                            : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {["q503", "q504", "q505", "q506"].includes(question.type) && (
            <div className={styles.sectionsWithTables}>
              <p>Секції з таблицями:</p>
              {sections2.map((sec, idx) => (
                <div key={sec.id || idx} className={styles.sectionWithTable}>
                  <div className={styles.sectionHeader}>
                    <strong>Підпитання {idx + 1}:</strong> {sec.subQuestion}
                  </div>
                  <table className={styles.sectionTable}>
                    <tbody>
                      {sec.tableData.slice(0, sec.rowCount).map((rowArr, rIndex) => (
                        <tr key={rIndex}>
                          {rowArr.slice(0, sec.colCount).map((cellObj, cIndex) => (
                            <td key={cIndex}>
                            {["q503", "q504"].includes(question.type) ? (
                                  <button className={styles.tableButton}>{cellObj.text || "Кнопка"}</button>
                                ) : ["q505", "q506"].includes(question.type) ? (
                                  rIndex === 0 ? cellObj.text : <button className={styles.tableButton}>{cellObj.text || "Кнопка"}</button>
                                ) : (
                                  cellObj.text
                                )}
                              {cellObj.videoLink && renderMediaPreview(cellObj.videoLink, "video")}
                              {cellObj.audioLink && renderMediaPreview(cellObj.audioLink, "audio")}
                              {cellObj.images?.length > 0 && (
                                <div className={styles.cellImages}>
                                  {cellObj.images.map((img, i2) => (
                                    <div key={i2} className={styles.imageContainer}>
                                      <img src={img} alt="" />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.questionActions}>
          <button
            onClick={() => setEditMode(true)}
            className={styles.editButton}
          >
            Редагувати питання
          </button>
          <div className={styles.secondaryActions}>
            <button onClick={onDelete} className={styles.deleteButton}>
              Видалити питання
            </button>
            <button onClick={onDuplicate} className={styles.duplicateButton}>
              Дублювати питання
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.questionBlock}>
      <h4>
        Редагування питання {question.id}
      </h4>
      <p style={{ fontStyle: "italic", color: "#555" }}>
        {getQuestionTypeInstruction(question.type)}
      </p>
      <div style={{ marginBottom: 10 }}>
        <label>Назва питання:</label>
        <input
          style={{ marginLeft: 5 }}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <button onClick={handleAddVideoQ}>
          <FaVideo size={18} style={{ marginRight: 5 }} />
        </button>
        <button onClick={handleAddAudioQ} style={{ marginLeft: 5 }}>
          <FaMicrophone size={18} style={{ marginRight: 5 }} />
        </button>
        <button onClick={handleAddImageQ} style={{ marginLeft: 5 }}>
          <FaImage size={18} style={{ marginRight: 5 }} />
        </button>
        {videoLink && renderMediaPreview(videoLink, "video")}
        {audioLink && renderMediaPreview(audioLink, "audio")}
        {images?.length > 0 && (
          <div style={{ marginTop: 5 }}>
            {images.map((img, idx) => (
              <span key={idx} style={{ marginRight: 5 }}>
                <img src={img} alt="" style={{ maxWidth: 60 }} />
              </span>
            ))}
          </div>
        )}
      </div>
      {["q101", "q102", "q103", "q201", "q202"].includes(question.type) && (
        <div style={{ marginTop: 10 }}>
          <h5>Варіанти відповідей:</h5>
          {answers.map((ans, i) => (
            <div key={ans.id || i} style={{ margin: "5px 0" }}>
              <input
                placeholder="Текст відповіді"
                value={ans.text}
                onChange={(e) => handleAnswerChange(i, "text", e.target.value)}
              />
              <button onClick={() => handleDeleteAnswer(i)} style={{ marginLeft: 5 }}>X</button>
              <button onClick={() => handleAnswerMedia(i, "video")} style={{ marginLeft: 5 }}>
                <FaVideo />
              </button>

              <button onClick={() => handleAnswerMedia(i, "audio")} style={{ marginLeft: 5 }}>
                <FaMicrophone />
              </button>

              <button onClick={() => handleAnswerMedia(i, "image")} style={{ marginLeft: 5 }}>
                <FaImage />
              </button>
              {ans.videoLink && renderMediaPreview(ans.videoLink, "video")}
              {ans.audioLink && renderMediaPreview(ans.audioLink, "audio")}
              {ans.images?.length > 0 &&
                ans.images.map((im2, i2) => (
                  <img key={i2} src={im2} alt="" style={{ width: 50, marginRight: 5 }} />
                ))}
            </div>
          ))}
          <button onClick={handleAddAnswer}>+</button>
          {["q101", "q102", "q103", "q201", "q202"].includes(question.type) && (
            <button onClick={handleBatchAddAnswers} style={{ marginLeft: 10 }}>
              Додати декілька
            </button>
          )}
        </div>
      )}
      {question.type === "q301" && (
        <div style={{ marginTop: 10 }}>
          <label>Введите целое число:</label>
          <input
            type="text"
            value={numericValue}
            onChange={(e) => setNumericValue(e.target.value)}
            style={{ marginLeft: 5 }}
          />
        </div>
      )}
      {question.type === "q302" && (
        <div style={{ marginTop: 10 }}>
          <label>Введите дробное число (через точку):</label>
          <input
            type="text"
            value={numericValue}
            onChange={(e) => setNumericValue(e.target.value)}
            style={{ marginLeft: 5 }}
          />
        </div>
      )}
      {question.type === "q303" && (
        <div style={{ marginTop: 10 }}>
          <input
            maxLength={50}
            placeholder="Введите ответ"
            value={answers[0]?.text || ""}
            onChange={(e) => setAnswers([{ id: "ansSingle", text: e.target.value }])}
          />
        </div>
      )}
      {question.type === "q304" && (
        <div style={{ marginTop: 10 }}>
          <textarea
            maxLength={100}
            value={answers[0]?.text || ""}
            onChange={(e) => setAnswers([{ id: "ansSingle", text: e.target.value }])}
          />
        </div>
      )}
      {question.type === "q305" && (
        <div style={{ marginTop: 10 }}>
          <textarea
            maxLength={300}
            value={answers[0]?.text || ""}
            onChange={(e) => setAnswers([{ id: "ansSingle", text: e.target.value }])}
          />
        </div>
      )}
      {question.type === "q306" && (
        <div style={{ marginTop: 10 }}>
          <p>Несколько кратких текстовых полей:</p>
          {multiShortAnswers.map((val, idx) => (
            <div key={idx} style={{ marginBottom: 5 }}>
              <input
                maxLength={50}
                placeholder={`${idx + 1}`}
                value={val}
                onChange={(e) => {
                  const copy = [...multiShortAnswers];
                  copy[idx] = e.target.value;
                  setMultiShortAnswers(copy);
                }}
              />
              <button onClick={() => {
                const copy = [...multiShortAnswers];
                copy.splice(idx, 1);
                setMultiShortAnswers(copy);
              }} style={{ marginLeft: 5 }}>X</button>
            </div>
          ))}
          <button onClick={() => setMultiShortAnswers([...multiShortAnswers, ""])}>+ Добавить поле</button>
        </div>
      )}
      {["q401", "q402", "q403", "q404", "q405"].includes(question.type) && (
        <div style={{ marginTop: 10 }}>
          <label>Мінімальна позначка шкали:</label>
          <input
            value={scaleMinLabel}
            onChange={(e) => setScaleMinLabel(e.target.value)}
            style={{ marginLeft: 5 }}
          />
          <br />
          <label>Максимальна позначка шкали:</label>
          <input
            value={scaleMaxLabel}
            onChange={(e) => setScaleMaxLabel(e.target.value)}
            style={{ marginLeft: 5 }}
          />
          <br />
          <button onClick={handleOpenScaleModal} style={{ marginTop: 5 }}>
            Задати значення шкали
          </button>
          {customScaleValues.length > 0 && (
            <div style={{ marginTop: 5, fontSize: "0.9em" }}>
              Текущие: {customScaleValues.join(", ")}
            </div>
          )}
          {question.type === "q405" && (
            <div style={{ marginTop: 5 }}>
              <label>Количество звёзд:</label>
              <input
                type="number"
                value={starsCount}
                onChange={(e) => setStarsCount(+e.target.value)}
                style={{ marginLeft: 5, width: 60 }}
              />
              <label style={{ marginLeft: 10 }}>Выбрано звёзд:</label>
              <input
                type="number"
                value={selectedStar}
                onChange={(e) => setSelectedStar(+e.target.value)}
                style={{ marginLeft: 5, width: 60 }}
              />
            </div>
          )}
        </div>
      )}
      {["q104", "q105"].includes(question.type) && (
        <div style={{ marginTop: 10 }}>
          <p>Секции (подвопрос + варианты):</p>
          {sections.map((sec, idx) => (
            <div key={sec.id || idx} style={{ border: "1px dashed #aaa", margin: 5, padding: 5 }}>
              <label>Підпитання #{idx + 1}:</label>
              <input
                style={{ marginLeft: 5 }}
                value={sec.subQuestion}
                onChange={(e) => handleSectionChange(idx, "subQuestion", e.target.value)}
              />
              <button onClick={() => handleDeleteSection(idx)} style={{ marginLeft: 5 }}>X</button>
              <p>Варианты ответа:</p>
              {sec.answers?.map((ans, aIndex) => (
                <div key={ans.id || aIndex} style={{ marginLeft: 20, marginBottom: 5 }}>
                  <input
                    placeholder="Текст відповіді"
                    value={ans.text}
                    onChange={(e) => handleSectionAnswerChange(idx, aIndex, "text", e.target.value)}
                  />
                  <button onClick={() => handleDeleteAnswerFromSection(idx, aIndex)} style={{ marginLeft: 5 }}>X</button>
                  <button onClick={() => handleSectionAnswerMedia(idx, aIndex, "video")} style={{ marginLeft: 5 }}>
                  <FaVideo />
                </button>
                <button onClick={() => handleSectionAnswerMedia(idx, aIndex, "audio")} style={{ marginLeft: 5 }}>
                  <FaMicrophone />
                </button>
                <button onClick={() => handleSectionAnswerMedia(idx, aIndex, "image")} style={{ marginLeft: 5 }}>
                  <FaImage />
                </button>
                  {ans.videoLink && renderMediaPreview(ans.videoLink, "video")}
                  {ans.audioLink && renderMediaPreview(ans.audioLink, "audio")}
                  {ans.images?.length > 0 &&
                    ans.images.map((im2, i2) => (
                      <img key={i2} src={im2} alt="" style={{ width: 50, marginRight: 5 }} />
                    ))}
                </div>
              ))}
              <button onClick={() => handleAddAnswerToSection(idx)}>+ Додати відповідь</button>
            </div>
          ))}
          <button onClick={handleAddSection}>+ Додати секцію</button>
        </div>
      )}
      {(question.type === "q501" ||
        question.type === "q502" ||
        question.type === "q506" ||
        question.type === "q507") && (
          <div style={{ marginTop: 10 }}>
            <p>Строки:</p>
            {rows.map((r, rIndex) => (
              <div key={r.id || rIndex} style={{ margin: "5px 0", paddingLeft: 10 }}>
                <input
                  placeholder="Текст рядка"
                  value={r.text}
                  onChange={(e) => handleRowChange(rIndex, "text", e.target.value)}
                />
              <button onClick={() => handleDeleteRow(rIndex)} style={{ marginLeft: 5 }}>
                <FaTimes />
              </button>
              <button onClick={() => handleRowMedia(rIndex, "video")} style={{ marginLeft: 5 }}>
                <FaVideo />
              </button>
              <button onClick={() => handleRowMedia(rIndex, "audio")} style={{ marginLeft: 5 }}>
                <FaMicrophone />
              </button>
              <button onClick={() => handleRowMedia(rIndex, "image")} style={{ marginLeft: 5 }}>
                <FaImage />
              </button>
              </div>
            ))}
            <button onClick={handleAddRow}>+ Строка</button>
            <p>Колонки:</p>
            {columns.map((c, cIndex) => (
              <div key={c.id || cIndex} style={{ margin: "5px 0", paddingLeft: 10 }}>
                <input
                  placeholder="Текст стовпчика"
                  value={c.text}
                  onChange={(e) => handleColChange(cIndex, "text", e.target.value)}
                />
                <button onClick={() => handleDeleteColumn(cIndex)} style={{ marginLeft: 5 }}>
                  <FaTimes />
                </button>
                <button onClick={() => handleColMedia(cIndex, "video")} style={{ marginLeft: 5 }}>
                  <FaVideo />
                </button>
                <button onClick={() => handleColMedia(cIndex, "audio")} style={{ marginLeft: 5 }}>
                  <FaMicrophone />
                </button>
                <button onClick={() => handleColMedia(cIndex, "image")} style={{ marginLeft: 5 }}>
                  <FaImage />
                </button>
              </div>
            ))}
            <button onClick={handleAddColumn}>+ Колонка</button>
          </div>
        )}
      {["q501", "q502", "q507"].includes(question.type) && (() => {
        const handleSetTableSize = () => {
          let maxR = 20, maxC = 10;
          if (question.type === "q507") maxC = 3;
          const input = prompt(
            `К-ть рядків x стовпців (max ${maxR}x${maxC})?`,
            `${tableRowCount}x${tableColCount}`
          );
          if (!input) return;
          const match = input.match(/^(\d+)x(\d+)$/);
          if (!match) {
            alert("Некоректний формат. Вкажіть, наприклад: 3x4");
            return;
          }
          let rCount = parseInt(match[1], 10);
          let cCount = parseInt(match[2], 10);
          if (question.type === "q507") cCount = 3;
          if (rCount > maxR) rCount = maxR;
          if (cCount > maxC) cCount = maxC;
          setTableRowCount(rCount);
          setTableColCount(cCount);

          let newData = [...tableData];
          if (newData.length < rCount) {
            for (let i = newData.length; i < rCount; i++) newData.push([]);
          } else if (newData.length > rCount) {
            newData = newData.slice(0, rCount);
          }
          newData = newData.map((rowArr) => {
            const copyRow = [...rowArr];
            if (copyRow.length < cCount) {
              for (let j = copyRow.length; j < cCount; j++) copyRow.push("");
            } else if (copyRow.length > cCount) {
              return copyRow.slice(0, cCount);
            }
            return copyRow;
          });
          setTableData(newData);
        };

        const handleChangeTableCell = (rIndex, cIndex, value) => {
          setTableData((prev) => {
            const newTD = [...prev];
            const rowCopy = [...newTD[rIndex]];
            rowCopy[cIndex] = value;
            newTD[rIndex] = rowCopy;
            return newTD;
          });
        };

        return (
          <div style={{ marginTop: 10 }}>
            <h5>Редактор таблиці для {question.type}:</h5>
            <p>Поточні розміри: {tableRowCount} рядків, {tableColCount} стовпців.</p>
            <button onClick={handleSetTableSize}>Змінити розміри</button>
            {tableData.slice(0, tableRowCount).map((rowArr, rIndex) => (
              <div key={rIndex} style={{ display: "flex", gap: "5px", marginTop: 5 }}>
                {rowArr.slice(0, question.type === "q507" ? 3 : tableColCount).map((cellValue, cIndex) => {
                  if (question.type === "q507" && (cIndex === 1 || cIndex === 2)) {
                    return <div key={cIndex} style={{ minWidth: 50 }}>[так/ні]</div>;
                  }
                  return (
                    <input
                      key={cIndex}
                      style={{ minWidth: 100 }}
                      value={cellValue}
                      onChange={(e) => handleChangeTableCell(rIndex, cIndex, e.target.value)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        );
      })()}
      {["q503", "q504", "q505", "q506"].includes(question.type) && (
        <div style={{ marginTop: 10 }}>
          <h5>Секції (підпитання + таблиця):</h5>
          {sections2.map((sec, idx) => (
            <div key={sec.id || idx} style={{ border: "1px dashed #aaa", margin: 5, padding: 5 }}>
              <label>Підпитання #{idx + 1}:</label>
              <input
                style={{ marginLeft: 5 }}
                value={sec.subQuestion}
                onChange={(e) => handleSection2Change(idx, "subQuestion", e.target.value)}
              />
              <button onClick={() => handleDeleteSection2(idx)} style={{ marginLeft: 5 }}>X</button>
              <div style={{ marginTop: 5 }}>
                {/* <p>Таблица: {sec.rowCount}x{sec.colCount}</p> */}
                <button onClick={() => handleSetSection2TableSize(idx)}>Змінити розміри</button>
                {sec.tableData.slice(0, sec.rowCount).map((rowArr, rIndex) => (
                  <div key={rIndex} style={{ marginTop: 5 }}>
                    <div style={{ display: "flex", gap: 5 }}>
                      {rowArr.slice(0, sec.colCount).map((cellObj, cIndex) => (
                        <div key={cIndex} style={{ border: "1px solid #ccc", padding: 5 }}>
                          <input
                            placeholder="Текст комірки"
                            value={cellObj.text || ""}
                            onChange={(e) =>
                              handleChangeSection2TableCell(idx, rIndex, cIndex, "text", e.target.value)
                            }
                          />
                          <div style={{ marginTop: 5 }}>
                          <button onClick={() => handleSection2CellAddMedia(idx, rIndex, cIndex, "video")}>
                            <FaVideo />
                          </button>
                          <button onClick={() => handleSection2CellAddMedia(idx, rIndex, cIndex, "audio")} style={{ marginLeft: 5 }}>
                            <FaMicrophone />
                          </button>
                          <button onClick={() => handleSection2CellAddMedia(idx, rIndex, cIndex, "image")} style={{ marginLeft: 5 }}>
                            <FaImage />
                          </button>
                          </div>
                          {cellObj.videoLink && renderMediaPreview(cellObj.videoLink, "video")}
                          {cellObj.audioLink && renderMediaPreview(cellObj.audioLink, "audio")}
                          {cellObj.images?.length > 0 &&
                            cellObj.images.map((ig, i2) => (
                              <img key={i2} src={ig} alt="" style={{ maxWidth: 40, marginRight: 5 }} />
                            ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button onClick={handleAddSection2}>+ Додати секцію</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 10 }}>
        <button onClick={handleSave}>
          <FaSave style={{ marginRight: 5 }} />

        </button>
        <button onClick={handleCancel}>
          <FaTimes style={{ marginRight: 5 }} />

        </button>
        <button onClick={onDelete}>
          <FaTrash style={{ marginRight: 5 }} />

        </button>
        <button onClick={onDuplicate}>
          <FaCopy style={{ marginRight: 5 }} />

        </button>
      </div>
      {showBatchModalAnswers && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalWindow}>
            <h3>Додати декілька</h3>
            <textarea
              rows={8}
              value={batchTextAnswers}
              onChange={(e) => setBatchTextAnswers(e.target.value)}
              style={{ width: "100%" }}
            />
            <div style={{ marginTop: 10, textAlign: "right" }}>
              <button onClick={handleBatchAnswersConfirm} style={{ marginRight: 10 }}>Додати</button>
              <button onClick={handleBatchAnswersCancel}>Скасувати</button>
            </div>
          </div>
        </div>
      )}
      {showScaleModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalWindow}>
            <h3>Користувацькі значення шкали</h3>
            <textarea
              rows={8}
              value={scaleModalText}
              onChange={(e) => setScaleModalText(e.target.value)}
              style={{ width: "100%" }}
            />
            <div style={{ marginTop: 10, textAlign: "right" }}>
              <button onClick={handleScaleModalConfirm} style={{ marginRight: 10 }}>Зберегти</button>
              <button onClick={handleScaleModalCancel}>Скасувати</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SurveyEditor() {
  const { surveyId: paramSurveyId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("survey");
  const [surveyID, setSurveyID] = useState(null);
  const [surveyName, setSurveyName] = useState("");
  const [description, setDescription] = useState("");
  const [logoLink, setLogoLink] = useState("");
  const [reward, setReward] = useState(0);
  const [timeNeeded, setTimeNeeded] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [passwordProtected, setPasswordProtected] = useState("ні");
  const [surveyPassword, setSurveyPassword] = useState("");
  const [invitedRespondents, setInvitedRespondents] = useState("");
  const [anketa, setAnketa] = useState([]);
  const [creationDate, setCreationDate] = useState("");
  const [status, setStatus] = useState("черновик");
  const [questionsShuffle, setQuestionsShuffle] = useState("ні");
  const [answersShuffle, setAnswersShuffle] = useState("ні");
  const [displayMode, setDisplayMode] = useState("single");
  const [accessibleQuestionTypes, setAccessibleQuestionTypes] = useState([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteChannel, setInviteChannel] = useState("system");
  const [inviteSubject, setInviteSubject] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  useEffect(() => {
    async function fetchAccessibleTypes() {
      try {
        const resp = await apiClient.get("/access_question_types");
        if (resp.data.success) setAccessibleQuestionTypes(resp.data.questionTypes);
      } catch { }
    }
    fetchAccessibleTypes();
  }, []);

  useEffect(() => {
    const fetchSurvey = async (id) => {
      try {
        const resp = await apiClient.get(`/surveys/${id}`);
        if (resp.data.success) {
          const s = resp.data.survey;
          setSurveyID(s.survey_id);
          setSurveyName(s.survey_name || "");
          setReward(s.reward || 0);
          setTimeNeeded(s.time_needed || 0);
          setStartDate(s.start_date || "");
          setEndDate(s.end_date || "");
          setPasswordProtected(s.password_protected || "ні");
          setSurveyPassword(s.password || "");
          setInvitedRespondents(s.invited_respondents || "");
          setCreationDate(s.creation_date || "");
          setStatus(s.status || "черновик");
          setDescription(s.description || "");
          setLogoLink(s.logo_link || "");
          setQuestionsShuffle(s.questions_shuffle || "ні");
          setAnswersShuffle(s.answers_shuffle || "ні");
          setDisplayMode(s.display_mode || "single");
          if (s.anketa) setAnketa(s.anketa);
        }
      } catch {
        alert("Не вдалося завантажити дані опитування");
      }
    };
    if (paramSurveyId) fetchSurvey(paramSurveyId);
    else {
      setSurveyID(null);
      setSurveyName("");
      setReward(0);
      setTimeNeeded(0);
      setStartDate("");
      setEndDate("");
      setPasswordProtected("ні");
      setSurveyPassword("");
      setInvitedRespondents("");
      setCreationDate("");
      setStatus("черновик");
      setAnketa([]);
      setQuestionsShuffle("ні");
      setAnswersShuffle("ні");
      setDisplayMode("single");
    }
  }, [paramSurveyId]);

  const handlePreview = () => {
    if (!surveyID) {
      alert("Спочатку збережіть опитування");
      return;
    }
    navigate(`/survey-preview/${surveyID}`);
  };

  const handleSaveSurvey = async () => {
    try {
      const body = {
        survey_name: surveyName,
        reward,
        time_needed: timeNeeded,
        start_date: startDate,
        end_date: endDate,
        password_protected: passwordProtected,
        password: surveyPassword,
        invited_respondents: invitedRespondents,
        anketa,
        description,
        logo_link: logoLink,
        questions_shuffle: questionsShuffle,
        answers_shuffle: answersShuffle,
        display_mode: displayMode
      };
      if (!surveyID) {
        const resp = await apiClient.post("/surveys/create", body);
        if (resp.data.success) {
          alert("Опитування створено");
          setSurveyID(resp.data.survey_id);
          navigate(`/survey-editor/${resp.data.survey_id}`);
        } else {
          alert("Помилка: " + resp.data.message);
        }
      } else {
        const resp = await apiClient.put(`/surveys/${surveyID}`, body);
        if (resp.data.success) alert("Опитування оновлено!");
        else alert("Помилка: " + resp.data.message);
      }
    } catch {
      alert("Помилка при збереженні опитування");
    }
  };

  const handleChangeStatus = async (newStatus) => {
    if (!surveyID) {
      alert("Спочатку збережіть опитування");
      return;
    }
    try {
      const resp = await apiClient.post(`/surveys/${surveyID}/status`, { status: newStatus });
      if (resp.data.success) {
        alert(`Статус змінено на: ${newStatus}`);
        setStatus(newStatus);
      } else {
        alert(resp.data.message || "Помилка зміни статусу");
      }
    } catch {
      alert("Помилка при зміні статусу");
    }
  };

  const openInviteModal = () => {
    if (!surveyID) {
      alert("Спочатку збережіть опитування");
      return;
    }
    setInviteSubject(`Пропонуємо взяти участь в опитуванні: ${surveyName}`);
    setInviteMessage("");
    setInviteChannel("system");
    setInviteModalOpen(true);
  };


  const handleConfirmSendInvites = async () => {
    try {
      const resp1 = await apiClient.post(`/surveys/${surveyID}/invite`);
      if (!resp1.data.success) {
        alert("Помилка надсилання запрошень:" + resp1.data.message);
        return;
      }
      let finalMessage = inviteMessage;
      if (inviteChannel === "system") {
        finalMessage += `\n\nПосилання для проходження: http://localhost:5173/survey-pass/${surveyID}`;
      }
      if (!invitedRespondents || invitedRespondents.trim() === "") {
        alert("Ви не вказали, кому надсилати запрошення");
        return;
      }
      const recipientsStr = invitedRespondents.trim();
      const resp2 = await apiClient.post("/notifications", {
        channel: inviteChannel,
        recipients: recipientsStr,
        subject: inviteSubject,
        message: finalMessage,
        image_link: "",
        signature: ""
      });
      if (!resp2.data.success) {
        alert("Помилка надсилання повідомлень:" + resp2.data.message);
        return;
      }
      alert("Запрошення та повідомлення надіслані!");
      setInviteModalOpen(false);
    } catch {
      alert("Помилка при надсиланні запрошень/повідомлень");
    }
  };

  const canSendInvites = status === "активный" && invitedRespondents.trim() !== "";

  function isTypeAccessible(typeWithQ) {
    const numericPart = typeWithQ.substring(1);
    return accessibleQuestionTypes.includes(numericPart);
  }

  const addQuestionOfType = (type) => {
    const newQ = {
      id: "q_" + Date.now(),
      type,
      title: "",
      videoLink: "",
      audioLink: "",
      images: [],
      answers: [],
      rows: [],
      columns: [],
      sections: [],
      starsCount: 10,
      selectedStar: 0,
      scaleMinLabel: "",
      scaleMaxLabel: "",
      customScaleValues: [],
      multiShortAnswers: [],
      numericValue: "",
      tableRowCount: 0,
      tableColCount: 0,
      tableData: [],
      sections2: [],
      saved: false
    };
    setAnketa((prev) => [...prev, newQ]);
  };

  const handleSaveQuestion = (qId, updated) => {
    setAnketa((prev) => prev.map((q) => (q.id === qId ? { ...q, ...updated, saved: true } : q)));
  };
  const handleDeleteQuestion = (qId) => {
    setAnketa((prev) => prev.filter((q) => q.id !== qId));
  };
  const handleDuplicateQuestion = (qId) => {
    const original = anketa.find((q) => q.id === qId);
    if (original) {
      const copy = { ...original, id: "q_" + Date.now(), saved: false };
      setAnketa((prev) => [...prev, copy]);
    }
  };

  const addQuestion_q101 = () => addQuestionOfType("q101");

  return (
    <div className={styles.editorContainer}>
      <h2>Редагування опитування</h2>
      <div className={styles.statusContainer}>
        <span className={styles.statusBadge} data-status={status}>
          Статус: {status}ㅤ|
        </span>
        <span className={styles.dateBadge}>
          {creationDate || "не создан"}
        </span>
      </div>

      <div className={styles.tabsRow}>
        <button
          onClick={() => setActiveTab("survey")}
          className={activeTab === "survey" ? styles.activeTab : ""}
        >
          Опитування
        </button>
        <button
          onClick={() => setActiveTab("artificial-intelligence")}
          className={activeTab === "artificial-intelligence" ? styles.activeTab : ""}
        >
          AI помічник
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={activeTab === "settings" ? styles.activeTab : ""}
        >
          Налаштування
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={activeTab === "analytics" ? styles.activeTab : ""}
        >
          Аналітика
        </button>
        <button
          onClick={() => setActiveTab("answers")}
          className={activeTab === "answers" ? styles.activeTab : ""}
        >
          <span>Відповіді</span>
        </button>
        <button
          onClick={handlePreview}
          className={styles.previewButton}
        >
          <span>Предперегляд</span>
        </button>
      </div>

      {activeTab === "survey" && (
        <div>
          <h3>Шаблони питань</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <button
              onClick={addQuestion_q101}
              disabled={!isTypeAccessible("q101")}
            >
              101
            </button>
            <button
              onClick={() => addQuestionOfType("q102")}
              disabled={!isTypeAccessible("q102")}
            >
              102
            </button>
            <button
              onClick={() => addQuestionOfType("q103")}
              disabled={!isTypeAccessible("q103")}
            >
              103
            </button>
            <button
              onClick={() => addQuestionOfType("q104")}
              disabled={!isTypeAccessible("q104")}
            >
              104
            </button>
            <button
              onClick={() => addQuestionOfType("q105")}
              disabled={!isTypeAccessible("q105")}
            >
              105
            </button>
            <button
              onClick={() => addQuestionOfType("q201")}
              disabled={!isTypeAccessible("q201")}
            >
              201
            </button>
            <button
              onClick={() => addQuestionOfType("q202")}
              disabled={!isTypeAccessible("q202")}
            >
              202
            </button>
            <button
              onClick={() => addQuestionOfType("q301")}
              disabled={!isTypeAccessible("q301")}
            >
              301
            </button>
            <button
              onClick={() => addQuestionOfType("q302")}
              disabled={!isTypeAccessible("q302")}
            >
              302
            </button>
            <button
              onClick={() => addQuestionOfType("q303")}
              disabled={!isTypeAccessible("q303")}
            >
              303
            </button>
            <button
              onClick={() => addQuestionOfType("q304")}
              disabled={!isTypeAccessible("q304")}
            >
              304
            </button>
            <button
              onClick={() => addQuestionOfType("q305")}
              disabled={!isTypeAccessible("q305")}
            >
              305
            </button>
            <button
              onClick={() => addQuestionOfType("q306")}
              disabled={!isTypeAccessible("q306")}
            >
              306
            </button>
            <button
              onClick={() => addQuestionOfType("q401")}
              disabled={!isTypeAccessible("q401")}
            >
              401
            </button>
            <button
              onClick={() => addQuestionOfType("q402")}
              disabled={!isTypeAccessible("q402")}
            >
              402
            </button>
            <button
              onClick={() => addQuestionOfType("q403")}
              disabled={!isTypeAccessible("q403")}
            >
              403
            </button>
            <button
              onClick={() => addQuestionOfType("q404")}
              disabled={!isTypeAccessible("q404")}
            >
              404
            </button>
            <button
              onClick={() => addQuestionOfType("q405")}
              disabled={!isTypeAccessible("q405")}
            >
              405
            </button>
            <button
              onClick={() => addQuestionOfType("q501")}
              disabled={!isTypeAccessible("q501")}
            >
              501
            </button>
            <button
              onClick={() => addQuestionOfType("q502")}
              disabled={!isTypeAccessible("q502")}
            >
              502
            </button>
            <button
              onClick={() => addQuestionOfType("q503")}
              disabled={!isTypeAccessible("q503")}
            >
              503
            </button>
            <button
              onClick={() => addQuestionOfType("q504")}
              disabled={!isTypeAccessible("q504")}
            >
              504
            </button>
            <button
              onClick={() => addQuestionOfType("q505")}
              disabled={!isTypeAccessible("q505")}
            >
              505
            </button>
            <button
              onClick={() => addQuestionOfType("q506")}
              disabled={!isTypeAccessible("q506")}
            >
              506
            </button>
            <button
              onClick={() => addQuestionOfType("q507")}
              disabled={!isTypeAccessible("q507")}
            >
              507
            </button>
          </div>


          <div style={{ marginTop: 20 }}>
            <label>Посилання на логотип:</label>
            <input value={logoLink} onChange={(e) => setLogoLink(e.target.value)} />
            {logoLink && (
              <div style={{ marginTop: 5 }}>
                <img src={logoLink} alt="logo" style={{ maxWidth: 200 }} />
              </div>
            )}
            <br />
            <label>Назва опитування:</label>
            <input value={surveyName} onChange={(e) => setSurveyName(e.target.value)} />
            <br />
            <label>Опис опитування:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ marginTop: 20 }}>
            {anketa.map((q) => (
              <QuestionBlock
                key={q.id}
                question={q}
                onSave={(updData) => handleSaveQuestion(q.id, updData)}
                onDelete={() => handleDeleteQuestion(q.id)}
                onDuplicate={() => handleDuplicateQuestion(q.id)}
              />
            ))}
          </div>

          <button onClick={handleSaveSurvey} style={{ marginTop: 20 }}>
            Зберегти опитування
          </button>
        </div>
      )}

      {activeTab === "settings" && (
        <div>
          <label>Винагорода (бали):</label>
          <input
            type="number"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
          />
          <br />
          <label>Час проходження (хв.):</label>
          <input
            type="number"
            value={timeNeeded}
            onChange={(e) => setTimeNeeded(e.target.value)}
          />
          <br />
          <label>Дата початку:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <br />
          <label>Дата завершення:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <br />
          <label>Чи потрібен пароль?</label>
          <select
            value={passwordProtected}
            onChange={(e) => setPasswordProtected(e.target.value)}
          >
            <option value="нет">Ні</option>
            <option value="да">Так</option>
          </select>
          {passwordProtected === "так" && (
            <>
              <br />
              <label>Пароль:</label>
              <input
                type="text"
                value={surveyPassword}
                onChange={(e) => setSurveyPassword(e.target.value)}
              />
            </>
          )}
          <br />
          <label>Запрошені респонденти:</label>
          <input
            type="text"
            value={invitedRespondents}
            onChange={(e) => setInvitedRespondents(e.target.value)}
            placeholder="@client,123,@org"
          />
          <br />
          <label>Ротація питань: </label>
          <select
            value={questionsShuffle}
            onChange={(e) => setQuestionsShuffle(e.target.value)}
          >
            <option value="нет">Ні</option>
            <option value="да">Так</option>
          </select>
          <br />
          <label>Ротація відповідей: </label>
          <select
            value={answersShuffle}
            onChange={(e) => setAnswersShuffle(e.target.value)}
          >
            <option value="нет">Ні</option>
            <option value="да">Так</option>
          </select>
          <br />
          <label>Відображення питань:</label>
          <select
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value)}
          >
            <option value="single">Всі на одному екрані</option>
            <option value="multi">Кожен на своєму екрані</option>
          </select>
          <br />
          <div style={{ marginTop: 20 }}>
            <button onClick={() => handleChangeStatus("активный")}>Почати (активний)</button>
            <button onClick={() => handleChangeStatus("на паузе")}>Призупинити</button>
            <button onClick={() => handleChangeStatus("завершён")}>Завершити</button>
            <button onClick={() => handleChangeStatus("черновик")}>У чернетки</button>
            <br />
            <button
              onClick={openInviteModal}
              disabled={!canSendInvites}
              style={{ marginTop: 10 }}
            >
              Надіслати запрошення
            </button>
          </div>
          <button onClick={handleSaveSurvey} style={{ marginTop: 20 }}>
            Зберегти опитування
          </button>
        </div>
      )}

      {activeTab === "analytics" && <AnalyticsTab surveyID={surveyID} />}
      {activeTab === "answers" && <SurveyAnswersPage surveyID={surveyID} />}
      {activeTab === "artificial-intelligence" && <ArtificialIntelligenceTab surveyID={surveyID} />}

      {inviteModalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalWindow}>
            <h3>Надсилання запрошень</h3>
            <label>Канал зв'язку:</label>
            <select
              value={inviteChannel}
              onChange={(e) => setInviteChannel(e.target.value)}
              style={{ marginLeft: 5 }}
            >
              <option value="system">система</option>
              <option value="email">пошта</option>
            </select>
            <br />
            <br />
            <label>Тема повідомлення:</label>
            <input
              type="text"
              value={inviteSubject}
              onChange={(e) => setInviteSubject(e.target.value)}
              style={{ width: "100%", marginTop: 5 }}
            />
            <br />
            <label>Текст повідомлення:</label>
            <textarea
              rows={5}
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              style={{ width: "100%", marginTop: 5 }}
            />
            <div style={{ marginTop: 15, textAlign: "right" }}>
              <button onClick={handleConfirmSendInvites} style={{ marginRight: 10 }}>
                Надіслати
              </button>
              <button onClick={() => setInviteModalOpen(false)}>Скасувати</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SurveyEditor;
