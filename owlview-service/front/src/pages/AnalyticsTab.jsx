import styles from "../styles/AnalyticsTab.module.css";
import axios from "axios";
import React, { useEffect, useState } from "react";
import apiClient from "../utils/axiosConfig";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  TimeScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";

import {
  Line,
  Bar,
  Pie,
  PolarArea,
  Radar,
  Doughnut,
  Bubble,
  Scatter
} from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  TimeScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function AnalyticsTab({ surveyID }) {
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [answersFormat, setAnswersFormat] = useState("txt");
  const [dashboardsFormat, setDashboardsFormat] = useState("html");

  useEffect(() => {
    if (!surveyID) return;
    setLoading(true);
    apiClient
      .get(`/surveys/${surveyID}/analytics`)
      .then((resp) => {
        if (resp.data.success) {
          setAnalyticsData(resp.data.analytics);
        } else {
          console.error("Помилка:", resp.data.message);
        }
      })
      .catch((err) => {
        console.error("Помилка під час завантаження аналітики:", err);
      })
      .finally(() => setLoading(false));
  }, [surveyID]);

  const handleDownloadAnswers = async () => {
    try {
      const token = sessionStorage.getItem("authToken");
      const response = await axios.get(`/api/surveys/${surveyID}/answers/download?format=${answersFormat}`, {
        headers: {
          Authorization: token
        },
        responseType: 'blob'
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `answers_${surveyID}.${answersFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      alert("Помилка під час скачування відповідей");
    }
  };

  const handleDownloadDashboards = async () => {
    try {
      if (!surveyID) return;
      const token = sessionStorage.getItem("authToken");

      const resp = await axios.get(`/api/surveys/${surveyID}/analytics/download?format=${dashboardsFormat}`, {
        headers: {
          Authorization: token
        },
        responseType: 'blob'
      });

      const blobUrl = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `dashboards_${surveyID}.${dashboardsFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Помилка при скачуванні дашбордів:", error);
      alert("Неможливо завантажити дашборди");
    }
  };

  if (!surveyID) {
    return <div className={styles.noData}>Спершу збережіть опитування, щоб побачити аналітику.</div>;
  }
  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
      </div>
    );
  }
  if (!analyticsData) {
    return <div className={styles.noData}>Немає даних для відображення.</div>;
  }

  const {
    invited_count,
    completed_count,
    postponed_count,
    in_progress_count,
    average_time_minutes,
    question_analytics
  } = analyticsData;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Аналітика опитування</h2>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{invited_count}</div>
          <div className={styles.statLabel}>Запрошених респондентів</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{completed_count}</div>
          <div className={styles.statLabel}>Пройшли опитування</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{postponed_count}</div>
          <div className={styles.statLabel}>Відклали проходження</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{in_progress_count}</div>
          <div className={styles.statLabel}>Зараз проходять</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{average_time_minutes}</div>
          <div className={styles.statLabel}>Середній час (хв.)</div>
        </div>
      </div>

      <div className={styles.downloadSection}>
        <div className={styles.downloadHeader}>
          <h3>Завантажити всі відповіді</h3>
          <div className={styles.downloadControls}>
            <select
              className={styles.select}
              value={answersFormat}
              onChange={(e) => setAnswersFormat(e.target.value)}
            >
              <option value="txt">TXT</option>
            </select>
            <button className={styles.button} onClick={handleDownloadAnswers}>
              Завантажити
            </button>
          </div>
        </div>
      </div>

      <div className={styles.downloadSection}>
        <div className={styles.downloadHeader}>
          <h3>Завантажити всі дашборди</h3>
          <div className={styles.downloadControls}>
            <select
              className={styles.select}
              value={dashboardsFormat}
              onChange={(e) => setDashboardsFormat(e.target.value)}
            >
              <option value="html">HTML</option>
            </select>
            <button className={styles.button} onClick={handleDownloadDashboards}>
              Завантажити
            </button>
          </div>
        </div>
      </div>

      {question_analytics && question_analytics.map((question, index) => (
        <div className={styles.chartContainer} key={index}>
          <h3 className={styles.chartTitle}>{question.title}</h3>
          <AutoChartForQuestion questionStats={question} />
        </div>
      ))}
    </div>
  );
}

function AutoChartForQuestion({ questionStats }) {
  const dataArr = questionStats.answersDetail || [];
  const labels = dataArr.map(a => a.answerValue);
  const values = dataArr.map(a => a.count);
  const qType = questionStats.questionType;
  let chartType = null;

  if (["q101", "q102", "q103", "q104", "q105", "q201", "q202"].includes(qType)) {
    chartType = "bar";

  } else if (["q301", "q302"].includes(qType)) {
    chartType = "line";

  } else if (["q401", "q402"].includes(qType)) {
    chartType = "line";

  } else if (["q403", "q404"].includes(qType)) {
    chartType = "carto";

  } else if (qType === "q405") {
    chartType = "radar";

  } else if (["q501", "q502"].includes(qType)) {
    chartType = "pie";

  } else if (["q503", "q504"].includes(qType)) {
    chartType = "polarArea";

  } else if (["q505", "q506"].includes(qType)) {
    chartType = "doughnut";

  } else if (qType === "q507") {
    chartType = "pie";

  } else {
    chartType = "Bubble";
  }

  const chartData = {
    labels,
    datasets: [
      {
        label: questionStats.title,
        data: values,
        backgroundColor: "rgba(75,192,192,0.4)",
        borderColor: "rgba(75,192,192,1)",
        borderWidth: 1,
        fill: false
      }
    ]
  };

  const chartOptions = (chartType = "bar", isHorizontal = false) => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            font: { size: 12 },
            color: "#333",
          },
        },
        title: {
          display: true,
          text: questionStats.title || "Вопрос",
          font: { size: 16 },
          color: "#222",
          padding: { top: 10, bottom: 20 },
        },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            label: function (tooltipItem) {
              const value = tooltipItem.raw;
              const total = tooltipItem.chart._metasets[tooltipItem.datasetIndex].total;
              const percent = total ? ((value / total) * 100).toFixed(1) : 0;
              return `${tooltipItem.label}: ${value} (${percent}%)`;
            },
          },
        },
      },
    };

    if (["bar", "line", "area"].includes(chartType)) {
      baseOptions.indexAxis = isHorizontal ? "y" : "x";
      baseOptions.scales = {
        x: {
          beginAtZero: true,
          ticks: {
            color: "#444",
          },
          grid: {
            color: "#e0e0e0",
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            color: "#444",
          },
          grid: {
            color: "#e0e0e0",
          },
        },
      };
    }

    if (["radar"].includes(chartType)) {
      baseOptions.scales = {
        r: {
          angleLines: { display: true },
          suggestedMin: 0,
          suggestedMax: 100,
          pointLabels: {
            font: { size: 12 },
            color: "#444",
          },
        },
      };
    }

    if (["pie", "doughnut", "polarArea"].includes(chartType)) {
      delete baseOptions.scales;
      baseOptions.plugins.legend.position = "right";
    }

    return baseOptions;
  };

  switch (chartType) {
    case "line":
      return <Line data={chartData} options={chartOptions} />;

    case "area":
      chartData.datasets[0].fill = true;
      return <Line data={chartData} options={chartOptions} />;

    case "bar":
      return <Bar data={chartData} options={chartOptions} />;

    case "pie":
      return <Pie data={chartData} options={chartOptions} />;

    case "doughnut":
      return <Doughnut data={chartData} options={chartOptions} />;

    case "radar":
      return <Radar data={chartData} options={chartOptions} />;

    case "polarArea":
      return <PolarArea data={chartData} options={chartOptions} />;

    case "Bubble":
      return (
        <div>
          <Bubble
            data={{
              datasets: [
                {
                  label: questionStats.title,
                  data: values.map((v, i) => ({
                    x: i * 10 + 1,
                    y: v,
                    r: Math.sqrt(v) * 5 + 2
                  })),
                  backgroundColor: "rgba(255, 99, 132, 0.5)"
                }
              ]
            }}
            options={{ responsive: true }}
          />
        </div>
      );

    default:
      return <Bar data={chartData} options={chartOptions} />;
  }
}

function isImageUrl(str) {
  if (!str) return false;
  const lower = str.toLowerCase();
  return (
    lower.startsWith("http") &&
    (
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".png") ||
      lower.endsWith(".gif") ||
      lower.endsWith(".webp")
    )
  );
}

function isVideoUrl(str) {
  if (!str) return false;
  const lower = str.toLowerCase();
  return (
    lower.startsWith("http") &&
    (
      lower.endsWith(".mp4") ||
      lower.endsWith(".mov") ||
      lower.includes("youtube.com/watch")
    )
  );
}

export default AnalyticsTab;
