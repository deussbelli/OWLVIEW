import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../utils/axiosConfig";
import styles from "../styles/SurveyPass.module.css";

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function prepareQuestions(anketa, answersShuffle) {
  if (answersShuffle !== "да") {
    return anketa;
  }
  const newAnketa = JSON.parse(JSON.stringify(anketa));

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
        if (Array.isArray(sec.tableData)) {
          sec.tableData = shuffleArray(sec.tableData);
        }
      });
    }
    if (Array.isArray(q.tableData)) {
      q.tableData = shuffleArray(q.tableData);
    }
  });

  return newAnketa;
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
      <div className={styles.videoContainer}>
        <iframe
          className={styles.youtubeIframe}
          src={embedUrl}
          frameBorder="0"
          allowFullScreen
          title="YouTube Video"
        ></iframe>
      </div>
    );
  } else {
    return (
      <div className={styles.videoContainer}>
        <video src={url} controls className={styles.videoPlayer} />
      </div>
    );
  }
}

function renderAudio(url) {
  if (!url) return null;
  return (
    <div className={styles.audioContainer}>
      <audio controls className={styles.audioPlayer}>
        <source src={url} type="audio/mpeg" />
        Ваш браузер не підтримує тег audio.
      </audio>
    </div>
  );
}

function StarRatingQuestion({ question, selected, onChange }) {
  const count = question.starsCount || 5;
  const labels = question.customScaleValues || [];

  const handleSelect = (star) => {
    onChange(star);
  };

  return (
    <div className={styles.starRatingContainer}>
      <div className={styles.starRow}>
        {Array.from({ length: count }, (_, i) => i + 1).map((star) => {
          const isActive = star <= (selected || 0);
          return (
            <span
              key={star}
              onClick={() => handleSelect(star)}
              className={
                isActive ? styles.starItemActive : styles.starItemInactive
              }
            >
              ★
            </span>
          );
        })}
      </div>
      {selected ? (
        <div className={styles.starSelectedInfo}>
          Ви обрали {selected} / {count}
        </div>
      ) : null}
      {labels.length > 0 && (
        <div className={styles.starLabels}>
          {labels.map((lbl, i) => (
            <div key={i}>
              {i + 1}) {lbl}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderTable_q501_pass(question, answerObj, onChange) {
  const rows = question.rows || [];
  const columns = question.columns || [];

  const toggleCell = (rowId, colId) => {
    const oldTable = answerObj.table || {};
    let newRowSelection = [colId];
    const newTable = { ...oldTable, [rowId]: newRowSelection };
    onChange({ ...answerObj, table: newTable });
  };

  if (rows.length && columns.length) {
    return (
      <div className={styles.tableWrapper}>
        <table className={styles.tableCommon}>
          <thead>
            <tr>
              <th className={styles.tableHeaderEmptyCell}></th>
              {columns.map((col) => (
                <th key={col.id} className={styles.tableHeaderCell}>
                  {col.text}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const selectedCols = answerObj.table?.[r.id] || [];
              return (
                <tr key={r.id} className={styles.tableRow}>
                  <td className={styles.tableRowHeader}>{r.text}</td>
                  {columns.map((c) => {
                    const checked = selectedCols.includes(c.id);
                    return (
                      <td key={c.id} className={styles.tableCell}>
                        <input
                          type="radio"
                          name={`row_${r.id}_q501`}
                          checked={checked}
                          onChange={() => toggleCell(r.id, c.id)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  const tableData = question.tableData || [];
  const rowCount = question.tableRowCount || tableData.length;
  const colCount = question.tableColCount || (tableData[0] || []).length;

  const toggleCellIndex = (rIndex, cIndex) => {
    const keyRow = `r${rIndex}`;
    const keyCol = `c${cIndex}`;
    const oldTable = answerObj.table || {};
    let newRowSelection = [keyCol];
    const newTable = { ...oldTable, [keyRow]: newRowSelection };
    onChange({ ...answerObj, table: newTable });
  };

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.tableCommon}>
        <tbody>
          {tableData.slice(0, rowCount).map((rowArr, rIndex) => {
            const keyRow = `r${rIndex}`;
            const selectedCols = answerObj.table?.[keyRow] || [];
            return (
              <tr key={rIndex} className={styles.tableRow}>
                {rowArr.slice(0, colCount).map((cellVal, cIndex) => {
                  const keyCol = `c${cIndex}`;
                  const checked = selectedCols.includes(keyCol);
                  return (
                    <td key={cIndex} className={styles.tableCell}>
                      <div className={styles.tableCellText}>{cellVal}</div>
                      <input
                        type="radio"
                        checked={checked}
                        onChange={() => toggleCellIndex(rIndex, cIndex)}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function renderTable_q502_pass(question, answerObj, onChange) {
  const rows = question.rows || [];
  const columns = question.columns || [];

  const toggleCell = (rowId, colId) => {
    const oldTable = answerObj.table || {};
    const selectedCols = oldTable[rowId] || [];
    let newRowSelection = [...selectedCols];
    if (selectedCols.includes(colId)) {
      newRowSelection = newRowSelection.filter((c) => c !== colId);
    } else {
      newRowSelection.push(colId);
    }
    const newTable = { ...oldTable, [rowId]: newRowSelection };
    onChange({ ...answerObj, table: newTable });
  };

  if (rows.length && columns.length) {
    return (
      <div className={styles.tableWrapper}>
        <table className={styles.tableCommon}>
          <thead>
            <tr>
              <th className={styles.tableHeaderEmptyCell}></th>
              {columns.map((col) => (
                <th key={col.id} className={styles.tableHeaderCell}>
                  {col.text}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const selectedCols = answerObj.table?.[r.id] || [];
              return (
                <tr key={r.id} className={styles.tableRow}>
                  <td className={styles.tableRowHeader}>{r.text}</td>
                  {columns.map((c) => {
                    const checked = selectedCols.includes(c.id);
                    return (
                      <td key={c.id} className={styles.tableCell}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCell(r.id, c.id)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  const tableData = question.tableData || [];
  const rowCount = question.tableRowCount || tableData.length;
  const colCount = question.tableColCount || (tableData[0] || []).length;

  const toggleCellIndex = (rIndex, cIndex) => {
    const keyRow = `r${rIndex}`;
    const keyCol = `c${cIndex}`;
    const oldTable = answerObj.table || {};
    const rowSel = oldTable[keyRow] || [];
    let newArr = [...rowSel];
    if (newArr.includes(keyCol)) {
      newArr = newArr.filter((x) => x !== keyCol);
    } else {
      newArr.push(keyCol);
    }
    onChange({ ...answerObj, table: { ...oldTable, [keyRow]: newArr } });
  };

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.tableCommon}>
        <tbody>
          {tableData.slice(0, rowCount).map((rowArr, rIndex) => {
            const keyRow = `r${rIndex}`;
            const selectedCols = answerObj.table?.[keyRow] || [];
            return (
              <tr key={rIndex} className={styles.tableRow}>
                {rowArr.slice(0, colCount).map((cellVal, cIndex) => {
                  const keyCol = `c${cIndex}`;
                  const checked = selectedCols.includes(keyCol);
                  return (
                    <td key={cIndex} className={styles.tableCell}>
                      <div className={styles.tableCellText}>{cellVal}</div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCellIndex(rIndex, cIndex)}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function renderTable_q503_506_pass(question, answerObj, onChange) {
  const isOneAnswer = ["q503", "q505"].includes(question.type);
  const isMultiple = ["q504", "q506"].includes(question.type);

  const oldSections2 = answerObj.sections2 || {};

  const handleToggle = (secId, rIndex, cIndex) => {
    const secObj = oldSections2[secId] || {};
    const rowSel = secObj[rIndex] || [];

    let newRowSel = [...rowSel];
    if (isOneAnswer) {
      newRowSel = [cIndex];
    } else if (isMultiple) {
      if (newRowSel.includes(cIndex)) {
        newRowSel = newRowSel.filter((x) => x !== cIndex);
      } else {
        newRowSel.push(cIndex);
      }
    }

    const newSecObj = { ...secObj, [rIndex]: newRowSel };
    const newSections2 = { ...oldSections2, [secId]: newSecObj };
    onChange({ ...answerObj, sections2: newSections2 });
  };

  return (
    <div className={styles.subTablesContainer}>
      {(question.sections2 || []).map((sec, idx) => {
        const rowCount = sec.rowCount || sec.tableData.length;
        const colCount = sec.colCount || (sec.tableData[0] || []).length;
        const secAnswers = oldSections2[sec.id] || {};

        return (
          <div key={sec.id || idx} className={styles.subTableBlock}>
            <p className={styles.subQuestionTitle}>
              Підпитання {idx + 1}: {sec.subQuestion}
            </p>
            <table className={styles.tableCommon}>
              <tbody>
                {sec.tableData.slice(0, rowCount).map((rowArr, rIndex) => {
                  const isHeaderRow =
                    (question.type === "q505" || question.type === "q506") &&
                    rIndex === 0;

                  return (
                    <tr key={rIndex} className={styles.tableRow}>
                      {rowArr.slice(0, colCount).map((cellObj, cIndex) => {
                        if (isHeaderRow) {
                          return (
                            <td key={cIndex} className={styles.tableHeaderCell}>
                              <strong>{cellObj.text}</strong>
                              {cellObj.videoLink && renderVideo(cellObj.videoLink)}
                              {cellObj.audioLink && renderAudio(cellObj.audioLink)}
                              {cellObj.images &&
                                cellObj.images.map((img, i2) => (
                                  <img
                                    key={i2}
                                    src={img}
                                    alt=""
                                    className={styles.tableImage}
                                  />
                                ))}
                            </td>
                          );
                        } else {
                          const chosen = secAnswers[rIndex] || [];
                          const checked = chosen.includes(cIndex);

                          return (
                            <td key={cIndex} className={styles.tableCell}>
                              <label className={styles.checkLabel}>
                                <input
                                  type={isOneAnswer ? "radio" : "checkbox"}
                                  name={`sec2_${idx}_row${rIndex}`}
                                  checked={checked}
                                  onChange={() =>
                                    handleToggle(sec.id, rIndex, cIndex)
                                  }
                                  className={styles.checkInput}
                                />
                                {cellObj.text}
                              </label>
                              {cellObj.videoLink && renderVideo(cellObj.videoLink)}
                              {cellObj.audioLink && renderAudio(cellObj.audioLink)}
                              {cellObj.images &&
                                cellObj.images.map((img, i2) => (
                                  <img
                                    key={i2}
                                    src={img}
                                    alt=""
                                    className={styles.tableImage}
                                  />
                                ))}
                            </td>
                          );
                        }
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function renderTable_q507_pass(question, answerObj, onChange) {
  const rows = question.rows || [];
  const columns = question.columns || [];

  const toggleCheckbox = (rowId, colValue) => {
    const oldTable = answerObj.table || {};
    const rowSel = oldTable[rowId] || [];
    let newRowSel = [...rowSel];
    if (newRowSel.includes(colValue)) {
      newRowSel = newRowSel.filter((x) => x !== colValue);
    } else {
      newRowSel.push(colValue);
    }
    onChange({ ...answerObj, table: { ...oldTable, [rowId]: newRowSel } });
  };

  if (rows.length > 0 && columns.length >= 2) {
    const yesLabel = columns[0].text || "Да";
    const noLabel = columns[1].text || "Нет";
    return (
      <div className={styles.tableWrapper}>
        <table className={styles.tableCommon}>
          <thead>
            <tr>
              <th className={styles.tableHeaderCell}>Питання</th>
              <th className={styles.tableHeaderCell}>{yesLabel}</th>
              <th className={styles.tableHeaderCell}>{noLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const selected = answerObj.table?.[r.id] || [];
              return (
                <tr key={r.id} className={styles.tableRow}>
                  <td className={styles.tableRowHeader}>{r.text}</td>
                  <td className={styles.tableCell}>
                    <input
                      type="checkbox"
                      checked={selected.includes("yes")}
                      onChange={() => toggleCheckbox(r.id, "yes")}
                    />
                  </td>
                  <td className={styles.tableCell}>
                    <input
                      type="checkbox"
                      checked={selected.includes("no")}
                      onChange={() => toggleCheckbox(r.id, "no")}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  const tableData = question.tableData || [];
  const rowCount = question.tableRowCount || tableData.length;
  const yesLabel = (columns[0] && columns[0].text) || "Так";
  const noLabel = (columns[1] && columns[1].text) || "Ні";

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.tableCommon}>
        <thead>
          <tr>
            <th className={styles.tableHeaderCell}>Питання</th>
            <th className={styles.tableHeaderCell}>{yesLabel}</th>
            <th className={styles.tableHeaderCell}>{noLabel}</th>
          </tr>
        </thead>
        <tbody>
          {tableData.slice(0, rowCount).map((rowArr, rIndex) => {
            const questionText = rowArr[0] || "";
            const keyRow = `r${rIndex}`;
            const selected = answerObj.table?.[keyRow] || [];
            return (
              <tr key={rIndex} className={styles.tableRow}>
                <td className={styles.tableRowHeader}>{questionText}</td>
                <td className={styles.tableCell}>
                  <input
                    type="checkbox"
                    checked={selected.includes("yes")}
                    onChange={() => toggleCheckbox(keyRow, "yes")}
                  />
                </td>
                <td className={styles.tableCell}>
                  <input
                    type="checkbox"
                    checked={selected.includes("no")}
                    onChange={() => toggleCheckbox(keyRow, "no")}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TableQuestionPass({ question, answerObj, onChange }) {
  const { type } = question;

  if (type === "q501") return renderTable_q501_pass(question, answerObj, onChange);
  if (type === "q502") return renderTable_q502_pass(question, answerObj, onChange);
  if (["q503", "q504", "q505", "q506"].includes(type)) {
    return renderTable_q503_506_pass(question, answerObj, onChange);
  }
  if (type === "q507") return renderTable_q507_pass(question, answerObj, onChange);

  return <div className={styles.unknownTableType}>Невідомий тип таблиці: {type}</div>;
}

function renderQuestionUI(question, answerObj, onAnswerChange) {
  const { type } = question;
  const sel = answerObj || {};

  const setSelectedAnswers = (arr) => {
    onAnswerChange({ ...sel, selected_answers: arr });
  };
  const toggleMulti = (ansId) => {
    let newArr = sel.selected_answers ? [...sel.selected_answers] : [];
    if (newArr.includes(ansId)) {
      newArr = newArr.filter((x) => x !== ansId);
    } else {
      newArr.push(ansId);
    }
    setSelectedAnswers(newArr);
  };
  if (type === "q101") {
    return (
      <div className={styles.q101Container}>
        {question.answers?.map((ans) => {
          const checked = sel.selected_answers?.includes(ans.id) || false;
          return (
            <div key={ans.id} className={styles.q101AnswerBlock}>
              <label className={styles.q101AnswerLabel}>
                <input
                  type="radio"
                  checked={checked}
                  onChange={() => setSelectedAnswers([ans.id])}
                />
                <span className={styles.q101LabelText}>{ans.text}</span>
              </label>
              {ans.videoLink && renderVideo(ans.videoLink)}
              {ans.audioLink && renderAudio(ans.audioLink)}
              {ans.images?.map((img, i2) => (
                <img
                  key={i2}
                  src={img}
                  alt=""
                  className={styles.q101AnswerImage}
                />
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  if (type === "q102") {
    return (
      <div className={styles.q102Container}>
        {question.answers?.map((ans) => {
          const checked = sel.selected_answers?.includes(ans.id) || false;
          return (
            <div key={ans.id} className={styles.q102AnswerBlock}>
              <label className={styles.q102AnswerLabel}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleMulti(ans.id)}
                />
                <span className={styles.q102LabelText}>{ans.text}</span>
              </label>
              {ans.videoLink && renderVideo(ans.videoLink)}
              {ans.audioLink && renderAudio(ans.audioLink)}
              {ans.images?.map((img, i2) => (
                <img
                  key={i2}
                  src={img}
                  alt=""
                  className={styles.q102AnswerImage}
                />
              ))}
            </div>
          );
        })}
        <div className={styles.q102OtherBlock}>
          <label className={styles.q102OtherLabel}>
            Інше:{" "}
            <input
              type="text"
              value={sel.custom_text || ""}
              onChange={(e) =>
                onAnswerChange({ ...sel, custom_text: e.target.value })
              }
            />
          </label>
        </div>
      </div>
    );
  }

  if (type === "q103") {
    const selectedVal = sel.selected_answers?.[0] || "";
    return (
      <div className={styles.q103Container}>
        <select
          value={selectedVal}
          onChange={(e) => setSelectedAnswers([e.target.value])}
          className={styles.q103Select}
        >
          <option value="">-- оберіть --</option>
          {question.answers?.map((ans) => (
            <option key={ans.id} value={ans.id}>
              {ans.text}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (type === "q201") {
    const selectedVal = sel.selected_answers?.[0];
    return (
      <div className={styles.q201Container}>
        {question.answers?.map((ans) => {
          const isChecked = ans.id === selectedVal;
          return (
            <label
              key={ans.id}
              className={`${styles.q201AnswerBlock} ${isChecked ? styles.q201AnswerBlockActive : ""
                }`}
            >
              <input
                type="radio"
                className={styles.q201HiddenRadio}
                checked={isChecked}
                onChange={() => setSelectedAnswers([ans.id])}
              />
              <div className={styles.q201AnswerText}>{ans.text}</div>
              {ans.images?.map((img, i2) => (
                <img
                  key={i2}
                  src={img}
                  alt=""
                  className={styles.q201AnswerImage}
                />
              ))}
              {ans.videoLink && renderVideo(ans.videoLink)}
              {ans.audioLink && renderAudio(ans.audioLink)}
            </label>
          );
        })}
      </div>
    );
  }

  if (type === "q202") {
    return (
      <div className={styles.q202Container}>
        {question.answers?.map((ans) => {
          const isChecked = sel.selected_answers?.includes(ans.id) || false;
          return (
            <label
              key={ans.id}
              className={`${styles.q202AnswerBlock} ${isChecked ? styles.q202AnswerBlockActive : ""
                }`}
            >
              <input
                type="checkbox"
                className={styles.q202HiddenCheckbox}
                checked={isChecked}
                onChange={() => toggleMulti(ans.id)}
              />
              <div className={styles.q202AnswerText}>{ans.text}</div>
              {ans.images?.map((img, i2) => (
                <img
                  key={i2}
                  src={img}
                  alt=""
                  className={styles.q202AnswerImage}
                />
              ))}
              {ans.videoLink && renderVideo(ans.videoLink)}
              {ans.audioLink && renderAudio(ans.audioLink)}
            </label>
          );
        })}
      </div>
    );
  }

  if (type === "q301") {
    return (
      <div className={styles.q301Container}>
        <input
          type="number"
          value={sel.custom_text || ""}
          placeholder="Введіть ціле число"
          onChange={(e) =>
            onAnswerChange({ ...sel, custom_text: e.target.value })
          }
          className={styles.q301Input}
        />
      </div>
    );
  }
  if (type === "q302") {
    return (
      <div className={styles.q302Container}>
        <input
          type="text"
          value={sel.custom_text || ""}
          placeholder="Введіть дробове число (через крапку)"
          onChange={(e) =>
            onAnswerChange({ ...sel, custom_text: e.target.value })
          }
          className={styles.q302Input}
        />
      </div>
    );
  }

  if (type === "q303" || type === "q304" || type === "q305") {
    let rows = 2;
    let maxLen = 50;
    if (type === "q304") {
      rows = 3;
      maxLen = 100;
    } else if (type === "q305") {
      rows = 5;
      maxLen = 300;
    }
    return (
      <div className={styles.textareaContainer}>
        <textarea
          rows={rows}
          maxLength={maxLen}
          placeholder="Ваша відповідь..."
          value={sel.custom_text || ""}
          onChange={(e) =>
            onAnswerChange({ ...sel, custom_text: e.target.value })
          }
          className={styles.textareaCommon}
        />
      </div>
    );
  }

  if (type === "q306") {
    const countFields = question.multiShortAnswers?.length
      ? question.multiShortAnswers.length
      : 0;
    return (
      <div className={styles.q306Container}>
        {Array.from({ length: countFields }).map((_, idx) => {
          const fieldVal = sel[`field_${idx}`] || "";
          const placeholderText =
            question.multiShortAnswers?.[idx] || `Введіть значення #${idx + 1}`;
          return (
            <div key={idx} className={styles.q306FieldBlock}>
              <input
                type="text"
                maxLength={50}
                placeholder={placeholderText}
                value={fieldVal}
                onChange={(e) => {
                  onAnswerChange({ ...sel, [`field_${idx}`]: e.target.value });
                }}
                className={styles.q306FieldInput}
              />
            </div>
          );
        })}
      </div>
    );
  }

  if (type === "q401" || type === "q402") {
    const items = question.customScaleValues?.length
      ? question.customScaleValues
      : ["Light", "Medium", "Dark"];
    const selectedVal = sel.selected_scale || "";

    const handleSelectItem = (val) => {
      onAnswerChange({ ...sel, selected_scale: val });
    };

    const calcOpacity = (index) => {
      if (items.length <= 1) return 1;
      const step = (1 - 0.4) / (items.length - 1);
      return 0.4 + step * index;
    };

    if (type === "q401") {
      return (
        <div className={styles.q401Container}>
          {items.map((val, idx) => {
            const isActive = val === selectedVal;
            const opacity = calcOpacity(idx);
            return (
              <button
                key={idx}
                onClick={() => handleSelectItem(val)}
                className={`${styles.q401Button} ${isActive ? styles.q401ButtonActive : ""
                  }`}
                style={{ opacity }}
              >
                {val}
              </button>
            );
          })}
          {selectedVal && (
            <div className={styles.q401SelectedInfo}>
              Ви обрали: {selectedVal}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div className={styles.q402Container}>
          {items.map((val, idx) => {
            const isActive = val === selectedVal;
            const opacity = calcOpacity(idx);
            return (
              <button
                key={idx}
                onClick={() => handleSelectItem(val)}
                className={`${styles.q402Button} ${isActive ? styles.q402ButtonActive : ""
                  }`}
                style={{ opacity }}
              >
                {val}
              </button>
            );
          })}
          {selectedVal && (
            <div className={styles.q402SelectedInfo}>({selectedVal})</div>
          )}
        </div>
      );
    }
  }

  if (type === "q403" || type === "q404") {
    const items = question.customScaleValues?.length
      ? question.customScaleValues
      : ["1", "2", "3", "4", "5"];
    const sliderIndex = sel.sliderIndex || 0;

    const setSliderIndex = (newVal) => {
      onAnswerChange({ ...sel, sliderIndex: newVal });
    };

    if (type === "q403") {
      return (
        <div className={styles.q403Container}>
          <input
            type="range"
            min={0}
            max={items.length - 1}
            value={sliderIndex}
            onChange={(e) => setSliderIndex(+e.target.value)}
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
            Поточне значення: {items[sliderIndex]}
          </p>
        </div>
      );
    } else {
      return (
        <div className={styles.q404Container}>
          <input
            type="range"
            min={0}
            max={items.length - 1}
            value={sliderIndex}
            onChange={(e) => setSliderIndex(+e.target.value)}
            className={styles.q404RangeVertical}
          />
          <div className={styles.q404ScaleLabels}>
            {items.map((val, idx) => (
              <span key={idx} className={styles.q404ScaleLabel}>
                {val}
              </span>
            ))}
          </div>
          <p className={styles.q404SelectedValue}>({items[sliderIndex]})</p>
        </div>
      );
    }
  }

  if (type === "q405") {
    const selectedStar = sel.starValue || 0;
    return (
      <StarRatingQuestion
        question={question}
        selected={selectedStar}
        onChange={(num) => onAnswerChange({ ...sel, starValue: num })}
      />
    );
  }

  if (type === "q104" || type === "q105") {
    const isMultiple = type === "q105";
    const oldSections = sel.sections || {};

    const toggleSectionAnswer = (sectionId, ansId) => {
      const prevArr = oldSections[sectionId] || [];
      let newArr = [...prevArr];
      if (!isMultiple) {
        newArr = [ansId];
      } else {
        if (newArr.includes(ansId)) {
          newArr = newArr.filter((x) => x !== ansId);
        } else {
          newArr.push(ansId);
        }
      }
      onAnswerChange({
        ...sel,
        sections: {
          ...oldSections,
          [sectionId]: newArr
        }
      });
    };

    return (
      <div className={styles.q104_105Container}>
        {question.sections?.map((sec) => {
          const selectedList = oldSections[sec.id] || [];
          return (
            <div key={sec.id} className={styles.q104_105SectionBlock}>
              <p className={styles.q104_105SectionTitle}>{sec.subQuestion}</p>
              {sec.answers?.map((ans) => {
                const checked = selectedList.includes(ans.id);
                return (
                  <div key={ans.id} className={styles.q104_105AnswerBlock}>
                    <label>
                      <input
                        type={isMultiple ? "checkbox" : "radio"}
                        name={
                          isMultiple
                            ? `section_${sec.id}_${ans.id}`
                            : `section_${sec.id}`
                        }
                        checked={checked}
                        onChange={() => toggleSectionAnswer(sec.id, ans.id)}
                      />
                      {ans.text}
                    </label>
                    {ans.videoLink && renderVideo(ans.videoLink)}
                    {ans.audioLink && renderAudio(ans.audioLink)}
                    {ans.images?.map((img, i2) => (
                      <img
                        key={i2}
                        src={img}
                        alt=""
                        className={styles.q104_105AnswerImage}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  if (["q501", "q502", "q503", "q504", "q505", "q506", "q507"].includes(type)) {
    return (
      <TableQuestionPass
        question={question}
        answerObj={answerObj}
        onChange={onAnswerChange}
      />
    );
  }

  return (
    <div className={styles.unknownQuestionType}>
      Невідомий тип питання: {type}
    </div>
  );
}

export default function SurveyPass() {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [postponedIndex, setPostponedIndex] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const resp = await apiClient.get(`/surveys/${surveyId}`);
        if (!resp.data.success) {
          alert(resp.data.message || "Неможливо завантажити опитування.");
          setLoading(false);
          return;
        }
        let s = resp.data.survey;

        let anketaPrepared = s.anketa || [];
        if (s.questions_shuffle === "да") {
          anketaPrepared = shuffleArray(anketaPrepared);
        }
        anketaPrepared = prepareQuestions(anketaPrepared, s.answers_shuffle);
        s = { ...s, anketa: anketaPrepared };

        const contResp = await apiClient.get(`/surveys/${surveyId}/continue`);
        let storedIndex = 0;
        let partial = {};
        if (contResp.data.success) {
          storedIndex = contResp.data.current_question || 0;
          partial = contResp.data.partial_answers || {};
        }

        setSurvey(s);
        setAnswers(partial);

        if (s.display_mode === "multi") {
          setCurrentIndex(-1);
          setPostponedIndex(storedIndex);
        } else {
          setCurrentIndex(0);
        }
      } catch (err) {
        console.error(err);
        alert("Помилка під час завантаження опитування: " + err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [surveyId]);

  const updateQuestionAnswer = (qId, newAnsObj) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: newAnsObj
    }));
  };

  const handlePostpone = async () => {
    let current_q = 0;
    if (survey?.display_mode === "multi") {
      current_q = currentIndex < 0 ? 0 : currentIndex;
    }
    try {
      const resp = await apiClient.post(`/surveys/${surveyId}/postpone`, {
        current_question: current_q,
        partial_answers: answers
      });
      if (resp.data.success) {
        alert("Опитування відкладено! Ви зможете повернутися до нього пізніше.");
        navigate("/");
      } else {
        alert(resp.data.message || "Не вдалося відкласти опитування");
      }
    } catch (err) {
      console.error(err);
      alert("Помилка при відкладенні опитування:" + err.message);
    }
  };

  const handleSubmitAll = async () => {
    try {
      const resp = await apiClient.post(`/surveys/${surveyId}/pass`, {
        answers
      });
      if (resp.data.success) {
        alert("Дякую! Ваші відповіді збережені. Бали нараховані.");
        navigate("/");
      } else {
        alert(resp.data.message || "Помилка збереження відповідей.");
      }
    } catch (err) {
      console.error(err);
      alert("Помилка при надсиланні відповідей:" + err.message);
    }
  };

  if (loading) {
    return <div className={styles.loadingContainer}>Завантаження опитування...</div>;
  }
  if (!survey) {
    return (
      <div className={styles.notFoundContainer}>
        Опитування не знайдено або видалено.
      </div>
    );
  }

  const { survey_name, logo_link, description, anketa = [], display_mode } = survey;
  const totalQuestions = anketa.length;

  if (display_mode === "single") {
    return (
      <div className={styles.surveyOuterWrap}>
        <div className={styles.singleModeContainer}>
          <h2 className={styles.surveyTitle}>Проходження опитування:{survey_name}</h2>
          {logo_link && (
            <div className={styles.logoBlock}>
              <img src={logo_link} alt="logo" className={styles.surveyLogo} />
            </div>
          )}
          {description && (
            <div className={styles.surveyDescription}>{description}</div>
          )}
          {anketa.map((q, index) => {
            const ansObj = answers[q.id] || {};
            return (
              <div key={q.id} className={styles.singleQuestionContainer}>
                <h4 className={styles.questionHeader}>
                  Питання {index + 1} / {totalQuestions}
                </h4>
                {q.title && <p className={styles.questionTitle}>{q.title}</p>}
                {q.videoLink && renderVideo(q.videoLink)}
                {q.audioLink && renderAudio(q.audioLink)}
                {q.images?.map((img, i2) => (
                  <img
                    key={i2}
                    src={img}
                    alt=""
                    className={styles.questionImage}
                  />
                ))}

                {renderQuestionUI(q, ansObj, (newVal) =>
                  updateQuestionAnswer(q.id, newVal)
                )}
              </div>
            );
          })}

          <div className={styles.singleButtonsContainer}>
            <button onClick={handleSubmitAll} className={styles.submitButton}>
              Надіслати відповіді
            </button>
            <button onClick={handlePostpone} className={styles.postponeButton}>
              Відкласти
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentIndex < 0) {
    return (
      <div className={styles.surveyOuterWrap}>
        <div className={styles.multiModeContainer}>
          <h2 className={styles.surveyTitle}>Проходження опитування: {survey_name}</h2>
          {logo_link && (
            <div className={styles.logoBlock}>
              <img src={logo_link} alt="logo" className={styles.surveyLogo} />
            </div>
          )}
          {description && (
            <div className={styles.surveyDescription}>{description}</div>
          )}

          <button
            onClick={() => {
              if (postponedIndex > 0 && postponedIndex < anketa.length) {
                setCurrentIndex(postponedIndex);
              } else {
                setCurrentIndex(0);
              }
            }}
            className={styles.startButton}
          >
            Почати
          </button>
        </div></div>
    );
  }

  if (currentIndex >= anketa.length) {
    return (
      <div className={styles.multiModeContainer}>
        <h3 className={styles.finishedMessage}>Питання закінчились!</h3>
        <button onClick={handleSubmitAll} className={styles.submitButton}>
          Надіслати відповіді
        </button>
        <button onClick={handlePostpone} className={styles.postponeButton}>
          Відкласти
        </button>
      </div>
    );
  }
  const question = anketa[currentIndex];
  const ansObj = answers[question.id] || {};

  const handleNext = () => {
    setCurrentIndex((idx) => idx + 1);
  };
  const handlePrev = () => {
    setCurrentIndex((idx) => idx - 1);
  };

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === anketa.length - 1;

  return (
    <div className={styles.singleModeContainer}>
      <div className={styles.multiModeContainer}>
        <h3 className={styles.questionHeader}>
          Питання {currentIndex + 1} / {anketa.length}         </h3>
        {question.title && <p className={styles.questionTitle}>{question.title}</p>}
        {question.videoLink && renderVideo(question.videoLink)}
        {question.audioLink && renderAudio(question.audioLink)}
        {question.images?.map((img, i2) => (
          <img key={i2} src={img} alt="" className={styles.questionImage} />
        ))}

        <div className={styles.multiQuestionBody}>
          {renderQuestionUI(question, ansObj, (newVal) =>
            updateQuestionAnswer(question.id, newVal)
          )}
        </div>

        <div className={styles.multiButtonsContainer}>
          <button
            onClick={handlePrev}
            disabled={isFirst}
            className={styles.prevButton}
          >
            Назад
          </button>
          {!isLast && (
            <button onClick={handleNext} className={styles.nextButton}>
              Далі
            </button>
          )}
          {isLast && (
            <button
              onClick={() => setCurrentIndex(anketa.length)}
              className={styles.finishButton}
            >
              Завершити
            </button>
          )}
          <button onClick={handlePostpone} className={styles.postponeButton}>
            Відкласти
          </button>
        </div>
      </div></div>
  );
}

export { renderQuestionUI, prepareQuestions, renderVideo, renderAudio };
