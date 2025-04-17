import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Registration.module.css";
import apiClient from "../utils/axiosConfig";
import { GoogleLogin } from "@react-oauth/google";
import { useGoogleLogin } from "@react-oauth/google";

import {
  countries,
  regionCityData,
  genders,
  relationshipOptions,
  attitudeOptions,
  educationOptions,
  occupationOptions,
  organizationTypeOptions,
  employeesOptions,
} from "../data/data";

const Registration = ({ onRegisterSuccess }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("client");
  const [step, setStep] = useState(1);

  const [clientData, setClientData] = useState({
    name: "",
    surname: "",
    gender: "чоловік",
    birth_date: "",
    phone_number: "",
    email: "",
    password: "",
    country: "Україна",
    region: "Вінницька",
    city: "",
    relationship_status: "самотній/самотня",
    attitude_to_smoking: "нейтральне",
    attitude_to_alcohol: "нейтральне",
    attitude_to_drugs: "нейтральне",
    education: "без освіти",
    occupation: "Фронтенд-розробник",
  });

  const [orgData, setOrgData] = useState({
    organization_name: "",
    country: "Україна",
    region: "Вінницька",
    city: "",
    organization_head_name: "",
    organization_head_surname: "",
    organization_head_gender: "чоловік",
    organization_phone_number: "",
    organization_email: "",
    organization_password: "",
    organization_type: "IT-компанія",
    organization_registration_date: "",
    number_of_employees: "5-10",
    organization_registration_goal: "",
    documents: null,
    social_links_Instagram: "",
    social_links_Facebook: "",
    social_links_Discord: "",
    social_links_Telegram: "",
    organization_website: "",
  });

  const [agreementChecked, setAgreementChecked] = useState(false);
  const [notificationsChecked, setNotificationsChecked] = useState(false);
  const [showUserAgreement, setShowUserAgreement] = useState(false);
  const [errors, setErrors] = useState({});
  const clientCityOptions = regionCityData[clientData.region] || [];
  const orgCityOptions = regionCityData[orgData.region] || [];
  const passwordRegex =
    /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-={}[\]|\\:;"'<>,.?/~`])(?=.*\d)(?=.*[a-zA-Z]).{12,}$/;
  const phoneRegex = /^\+380\d{9}$/;
  const validateClientStep1 = () => {
    const newErrors = {};
    if (!clientData.name.trim()) {
      newErrors.name = "Введіть ім’я";
    }
    if (!clientData.surname.trim()) {
      newErrors.surname = "Введіть прізвище";
    }
    if (!clientData.birth_date) {
      newErrors.birth_date = "Укажіть дату народження";
    }
    if (!clientData.phone_number.trim()) {
      newErrors.phone_number = "Укажіть телефон";
    } else if (!phoneRegex.test(clientData.phone_number)) {
      newErrors.phone_number = "Телефон має бути формату +380XXXXXXXXX (13 символів)";
    }
    if (!clientData.email.trim()) {
      newErrors.email = "Укажіть пошту";
    } else if (!/\S+@\S+\.\S+/.test(clientData.email)) {
      newErrors.email = "Некоректний формат пошти";
    }
    if (!clientData.password.trim()) {
      newErrors.password = "Введіть пароль";
    } else if (!passwordRegex.test(clientData.password)) {
      newErrors.password =
        "Пароль ≥12 символів, з великою літерою, цифрою і спецсимволом";
    }
    return newErrors;
  };

  const validateClientStep2 = () => {
    const newErrors = {};
    if (!clientData.relationship_status) {
      newErrors.relationship_status = "Виберіть статус відносин";
    }
    return newErrors;
  };

  const validateOrgStep1 = () => {
    const newErrors = {};
    if (!orgData.organization_name.trim()) {
      newErrors.organization_name = "Введіть назву організації";
    }
    if (!orgData.organization_head_name.trim()) {
      newErrors.organization_head_name = "Введіть ім’я керівника";
    }
    if (!orgData.organization_head_surname.trim()) {
      newErrors.organization_head_surname = "Введіть прізвище керівника";
    }
    if (!orgData.organization_phone_number.trim()) {
      newErrors.organization_phone_number = "Укажіть контактний телефон";
    } else if (!phoneRegex.test(orgData.organization_phone_number)) {
      newErrors.organization_phone_number =
        "Номер має починатися з +380 і містити 13 символів";
    }
    if (!orgData.organization_email.trim()) {
      newErrors.organization_email = "Укажіть пошту";
    } else if (!/\S+@\S+\.\S+/.test(orgData.organization_email)) {
      newErrors.organization_email = "Некоректний формат пошти";
    }
    if (!orgData.organization_password.trim()) {
      newErrors.organization_password = "Введіть пароль";
    } else if (!passwordRegex.test(orgData.organization_password)) {
      newErrors.organization_password =
        "Пароль ≥12 символів, з великою літерою, цифрою і спецсимволом";
    }
    return newErrors;
  };

  const validateOrgStep2 = () => {
    const newErrors = {};
    if (!orgData.organization_registration_date) {
      newErrors.organization_registration_date = "Укажіть дату реєстрації";
    }
    if (!orgData.organization_registration_goal.trim()) {
      newErrors.organization_registration_goal = "Укажіть мету реєстрації";
    }
    return newErrors;
  };

  const validateOrgStep3 = () => {
    const newErrors = {};
    if (!orgData.documents) {
      newErrors.documents = "Завантажте документ (pdf/jpg/png)";
    }
    return newErrors;
  };

  const handleNext = () => {
    if (activeTab === "client") {
      if (step === 1) {
        const step1Errors = validateClientStep1();
        if (Object.keys(step1Errors).length > 0) {
          setErrors(step1Errors);
          return;
        }
        setErrors({});
        setStep(2);
      } else if (step === 2) {
        const step2Errors = validateClientStep2();
        if (Object.keys(step2Errors).length > 0) {
          setErrors(step2Errors);
          return;
        }
        setErrors({});
        handleSubmitFinal();
      }
    } else {
      if (step === 1) {
        const step1Errors = validateOrgStep1();
        if (Object.keys(step1Errors).length > 0) {
          setErrors(step1Errors);
          return;
        }
        setErrors({});
        setStep(2);
      } else if (step === 2) {
        const step2Errors = validateOrgStep2();
        if (Object.keys(step2Errors).length > 0) {
          setErrors(step2Errors);
          return;
        }
        setErrors({});
        setStep(3);
      } else if (step === 3) {
        const step3Errors = validateOrgStep3();
        if (Object.keys(step3Errors).length > 0) {
          setErrors(step3Errors);
          return;
        }
        setErrors({});
        handleSubmitFinal();
      }
    }
  };

  const handleSubmitFinal = async () => {
    if (!agreementChecked) {
      alert("Будь ласка, прийміть користувальницьку угоду");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("role", activeTab === "client" ? "client" : "organization");
      formData.append("agreementChecked", agreementChecked ? "1" : "0");
      formData.append("notificationsChecked", notificationsChecked ? "1" : "0");

      if (activeTab === "client") {
        Object.keys(clientData).forEach((key) => {
          formData.append(key, clientData[key]);
        });
      } else {
        Object.keys(orgData).forEach((key) => {
          if (key === "documents" && orgData.documents instanceof File) {
            formData.append("documents", orgData.documents);
          } else {
            formData.append(key, orgData[key]);
          }
        });
      }

      const registerResponse = await apiClient.post("/register", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (registerResponse.data.success) {
        alert("Реєстрація пройшла успішно!");

        let email, password;
        if (activeTab === "client") {
          email = clientData.email;
          password = clientData.password;
        } else {
          email = orgData.organization_email;
          password = orgData.organization_password;
        }

        const loginResponse = await apiClient.post("/login", { email, password });
        if (loginResponse.data.success) {
          const userData = loginResponse.data.user;
          if (onRegisterSuccess) {
            onRegisterSuccess(userData);
          }
          navigate("/");
        } else {
          alert("Помилка автологіну: " + (loginResponse.data.message || ""));
          navigate("/login");
        }
      } else {
        alert("Помилка: " + registerResponse.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Сталася помилка при реєстрації!");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
  };
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      if (activeTab === "organization") {
        alert("Організації не можуть реєструватися через Google");
        return;
      }
      const idToken = credentialResponse.credential;
      const response = await apiClient.post("/google-auth", { token: idToken });
      if (response.data.success) {
        alert("Успішна реєстрація/вхід через Google!");
        const { user } = response.data;
        sessionStorage.setItem("authToken", user.token);
        sessionStorage.setItem("user", JSON.stringify(user));

        if (onRegisterSuccess) {
          onRegisterSuccess(user);
        }
        navigate("/");
      } else {
        alert("Помилка Google-реєстрації: " + response.data.message);
      }
    } catch (err) {
      console.error("Google registration error:", err);
      alert("Сталася помилка при реєстрації через Google!");
    }
  };

  const handleGoogleError = () => {
    console.error("Google Login Failed");
    alert("Google Login Failed!");
  };

  return (
    <div className={styles.container}>
      <h1>Реєстрація</h1>

      <form onSubmit={handleSubmit}>
        <div className={styles.tabs}>
          <div
            className={activeTab === "client" ? styles.tabActive : styles.tab}
            onClick={() => {
              setActiveTab("client");
              setStep(1);
              setErrors({});
            }}
          >
            Клієнт
          </div>
          <div
            className={activeTab === "organization" ? styles.tabActive : styles.tab}
            onClick={() => {
              setActiveTab("organization");
              setStep(1);
              setErrors({});
            }}
          >
            Організація
          </div>
        </div>

        {activeTab === "client" && step === 1 && (
          <>
            <div className={styles.formGroup}>
              <label>Ім’я</label>
              <input
                type="text"
                name="name"
                value={clientData.name}
                onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
              />
              {errors.name && <div className={styles.error}>{errors.name}</div>}
            </div>

            <div className={styles.formGroup}>
              <label>Прізвище</label>
              <input
                type="text"
                name="surname"
                value={clientData.surname}
                onChange={(e) => setClientData({ ...clientData, surname: e.target.value })}
              />
              {errors.surname && <div className={styles.error}>{errors.surname}</div>}
            </div>

            <div className={styles.formGroup}>
              <label>Гендер</label>
              <select
                name="gender"
                value={clientData.gender}
                onChange={(e) => setClientData({ ...clientData, gender: e.target.value })}
              >
                {genders.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Дата народження</label>
              <input
                type="date"
                name="birth_date"
                value={clientData.birth_date}
                onChange={(e) => setClientData({ ...clientData, birth_date: e.target.value })}
              />
              {errors.birth_date && <div className={styles.error}>{errors.birth_date}</div>}
            </div>

            <div className={styles.formGroup}>
              <label>Телефон</label>
              <input
                type="text"
                name="phone_number"
                placeholder="+380..."
                value={clientData.phone_number}
                onChange={(e) => setClientData({ ...clientData, phone_number: e.target.value })}
              />
              {errors.phone_number && <div className={styles.error}>{errors.phone_number}</div>}
            </div>

            <div className={styles.formGroup}>
              <label>Пошта</label>
              <input
                type="email"
                name="email"
                value={clientData.email}
                onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
              />
              {errors.email && <div className={styles.error}>{errors.email}</div>}
            </div>

            <div className={styles.formGroup}>
              <label>Пароль</label>
              <input
                type="password"
                name="password"
                value={clientData.password}
                onChange={(e) => setClientData({ ...clientData, password: e.target.value })}
              />
              {errors.password && <div className={styles.error}>{errors.password}</div>}
            </div>
          </>
        )}

        {activeTab === "client" && step === 2 && (
          <>
            <div className={styles.formGroup}>
              <label>Країна</label>
              <select
                name="country"
                value={clientData.country}
                onChange={(e) => setClientData({ ...clientData, country: e.target.value })}
              >
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Область</label>
              <select
                name="region"
                value={clientData.region}
                onChange={(e) => {
                  const newRegion = e.target.value;
                  setClientData({
                    ...clientData,
                    region: newRegion,
                    city: "",
                  });
                }}
              >
                {Object.keys(regionCityData).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Населений пункт</label>
              <select
                name="city"
                value={clientData.city}
                onChange={(e) => setClientData({ ...clientData, city: e.target.value })}
              >
                <option value="">-- оберіть місто --</option>
                {clientCityOptions.map((cityName) => (
                  <option key={cityName} value={cityName}>
                    {cityName}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Сімейний стан</label>
              <select
                name="relationship_status"
                value={clientData.relationship_status}
                onChange={(e) =>
                  setClientData({ ...clientData, relationship_status: e.target.value })
                }
              >
                {relationshipOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {errors.relationship_status && (
                <div className={styles.error}>{errors.relationship_status}</div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Ставлення до куріння</label>
              <select
                name="attitude_to_smoking"
                value={clientData.attitude_to_smoking}
                onChange={(e) =>
                  setClientData({ ...clientData, attitude_to_smoking: e.target.value })
                }
              >
                {attitudeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Ставлення до алкоголю</label>
              <select
                name="attitude_to_alcohol"
                value={clientData.attitude_to_alcohol}
                onChange={(e) =>
                  setClientData({ ...clientData, attitude_to_alcohol: e.target.value })
                }
              >
                {attitudeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Ставлення до наркотиків</label>
              <select
                name="attitude_to_drugs"
                value={clientData.attitude_to_drugs}
                onChange={(e) =>
                  setClientData({ ...clientData, attitude_to_drugs: e.target.value })
                }
              >
                {attitudeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Освіта</label>
              <select
                name="education"
                value={clientData.education}
                onChange={(e) =>
                  setClientData({ ...clientData, education: e.target.value })
                }
              >
                {educationOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Рід занять</label>
              <select
                name="occupation"
                value={clientData.occupation}
                onChange={(e) =>
                  setClientData({ ...clientData, occupation: e.target.value })
                }
              >
                {occupationOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {activeTab === "organization" && step === 1 && (
          <>
            <div className={styles.formGroup}>
              <label>Назва організації</label>
              <input
                type="text"
                name="organization_name"
                value={orgData.organization_name}
                onChange={(e) =>
                  setOrgData({ ...orgData, organization_name: e.target.value })
                }
              />
              {errors.organization_name && (
                <div className={styles.error}>{errors.organization_name}</div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Країна</label>
              <select
                name="country"
                value={orgData.country}
                onChange={(e) =>
                  setOrgData({ ...orgData, country: e.target.value })
                }
              >
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Область</label>
              <select
                name="region"
                value={orgData.region}
                onChange={(e) => {
                  const newRegion = e.target.value;
                  setOrgData({
                    ...orgData,
                    region: newRegion,
                    city: "",
                  });
                }}
              >
                {Object.keys(regionCityData).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Населений пункт</label>
              <select
                name="city"
                value={orgData.city}
                onChange={(e) => setOrgData({ ...orgData, city: e.target.value })}
              >
                <option value="">-- оберіть місто --</option>
                {orgCityOptions.map((cityName) => (
                  <option key={cityName} value={cityName}>
                    {cityName}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Ім’я керівника</label>
              <input
                type="text"
                name="organization_head_name"
                value={orgData.organization_head_name}
                onChange={(e) =>
                  setOrgData({ ...orgData, organization_head_name: e.target.value })
                }
              />
              {errors.organization_head_name && (
                <div className={styles.error}>{errors.organization_head_name}</div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Прізвище керівника</label>
              <input
                type="text"
                name="organization_head_surname"
                value={orgData.organization_head_surname}
                onChange={(e) =>
                  setOrgData({ ...orgData, organization_head_surname: e.target.value })
                }
              />
              {errors.organization_head_surname && (
                <div className={styles.error}>
                  {errors.organization_head_surname}
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Гендер керівника</label>
              <select
                name="organization_head_gender"
                value={orgData.organization_head_gender}
                onChange={(e) =>
                  setOrgData({ ...orgData, organization_head_gender: e.target.value })
                }
              >
                {genders.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Контактний телефон</label>
              <input
                type="text"
                name="organization_phone_number"
                placeholder="+380..."
                value={orgData.organization_phone_number}
                onChange={(e) =>
                  setOrgData({
                    ...orgData,
                    organization_phone_number: e.target.value,
                  })
                }
              />
              {errors.organization_phone_number && (
                <div className={styles.error}>{errors.organization_phone_number}</div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Пошта</label>
              <input
                type="email"
                name="organization_email"
                value={orgData.organization_email}
                onChange={(e) =>
                  setOrgData({ ...orgData, organization_email: e.target.value })
                }
              />
              {errors.organization_email && (
                <div className={styles.error}>{errors.organization_email}</div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Пароль</label>
              <input
                type="password"
                name="organization_password"
                value={orgData.organization_password}
                onChange={(e) =>
                  setOrgData({ ...orgData, organization_password: e.target.value })
                }
              />
              {errors.organization_password && (
                <div className={styles.error}>{errors.organization_password}</div>
              )}
            </div>
          </>
        )}

        {activeTab === "organization" && step === 2 && (
          <>
            <div className={styles.formGroup}>
              <label>Сфера діяльності</label>
              <select
                name="organization_type"
                value={orgData.organization_type}
                onChange={(e) =>
                  setOrgData({ ...orgData, organization_type: e.target.value })
                }
              >
                {organizationTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Дата реєстрації організації</label>
              <input
                type="date"
                name="organization_registration_date"
                value={orgData.organization_registration_date}
                onChange={(e) =>
                  setOrgData({
                    ...orgData,
                    organization_registration_date: e.target.value,
                  })
                }
              />
              {errors.organization_registration_date && (
                <div className={styles.error}>
                  {errors.organization_registration_date}
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Кількість співробітників</label>
              <select
                name="number_of_employees"
                value={orgData.number_of_employees}
                onChange={(e) =>
                  setOrgData({ ...orgData, number_of_employees: e.target.value })
                }
              >
                {employeesOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Мета реєстрації</label>
              <input
                type="text"
                name="organization_registration_goal"
                value={orgData.organization_registration_goal}
                onChange={(e) =>
                  setOrgData({
                    ...orgData,
                    organization_registration_goal: e.target.value,
                  })
                }
              />
              {errors.organization_registration_goal && (
                <div className={styles.error}>
                  {errors.organization_registration_goal}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "organization" && step === 3 && (
          <>
            <div className={styles.formGroup}>
              <label>Документи (pdf/jpg/png)</label>
              <input
                type="file"
                name="documents"
                onChange={(e) =>
                  setOrgData({ ...orgData, documents: e.target.files[0] })
                }
                accept=".pdf,.jpg,.jpeg,.png"
              />
              {errors.documents && (
                <div className={styles.error}>{errors.documents}</div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Instagram</label>
              <input
                type="text"
                name="social_links_Instagram"
                value={orgData.social_links_Instagram}
                onChange={(e) =>
                  setOrgData({
                    ...orgData,
                    social_links_Instagram: e.target.value,
                  })
                }
              />
            </div>
            <div className={styles.formGroup}>
              <label>Facebook</label>
              <input
                type="text"
                name="social_links_Facebook"
                value={orgData.social_links_Facebook}
                onChange={(e) =>
                  setOrgData({
                    ...orgData,
                    social_links_Facebook: e.target.value,
                  })
                }
              />
            </div>
            <div className={styles.formGroup}>
              <label>Discord</label>
              <input
                type="text"
                name="social_links_Discord"
                value={orgData.social_links_Discord}
                onChange={(e) =>
                  setOrgData({
                    ...orgData,
                    social_links_Discord: e.target.value,
                  })
                }
              />
            </div>
            <div className={styles.formGroup}>
              <label>Telegram</label>
              <input
                type="text"
                name="social_links_Telegram"
                value={orgData.social_links_Telegram}
                onChange={(e) =>
                  setOrgData({
                    ...orgData,
                    social_links_Telegram: e.target.value,
                  })
                }
              />
            </div>
            <div className={styles.formGroup}>
              <label>Сайт</label>
              <input
                type="text"
                name="organization_website"
                value={orgData.organization_website}
                onChange={(e) =>
                  setOrgData({
                    ...orgData,
                    organization_website: e.target.value,
                  })
                }
              />
            </div>
          </>
        )}

        {((activeTab === "client" && step === 2) ||
          (activeTab === "organization" && step === 3)) && (
            <>
              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  checked={agreementChecked}
                  onChange={() => setAgreementChecked(!agreementChecked)}
                />
                <span className={styles.checkboxLabel}>
                  Я погоджуюся з{" "}
                  <span
                    className={styles.agreementLink}
                    onClick={() => setShowUserAgreement(true)}
                  >
                    користувацькою угодою
                  </span>
                </span>
              </div>

              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  checked={notificationsChecked}
                  onChange={() => setNotificationsChecked(!notificationsChecked)}
                />
                <span className={styles.checkboxLabel}>
                  Я хочу отримувати сповіщення на пошту
                </span>
              </div>
            </>
          )}

        <div className={styles.stepNavigation}>
          {(activeTab === "client" && step < 2) ||
            (activeTab === "organization" && step < 3) ? (
            <button type="button" onClick={handleNext} className={styles.button}>
              Далі
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className={styles.button}
            >
              Завершити
            </button>
          )}
        </div>
      </form>

      {activeTab === "client" && (
        <div style={{ marginTop: "20px" }}>
          <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        <a href="/login">У мене вже є аккаунт</a>
      </div>

      {showUserAgreement && (
        <div className={styles.policyModal}>
          <div className={styles.policyContent}>
            <h2>Користувацька угода</h2>
            <p>
              Дата набуття чинності:  08.01.2025
              <br />
              Вітаємо у OwlView! Ця Користувацька угода (далі — «Угода») є юридично зобов'язуючим документом між вами (далі — «Користувач») та
              ТОВ "OwlView" (далі — «Компанія», «Ми», «Нас», «Наш»), що регулює користування платформою OwlView (далі — «Сервіс»).
              <br /><br />
              1. Прийняття умов<br />
              Користуючись Сервісом, ви підтверджуєте, що ознайомились з цією Угодою, зрозуміли її зміст і погоджуєтесь дотримуватись її умов. Якщо ви не погоджуєтесь з умовами — будь ласка, не користуйтесь Сервісом.
              <br /><br />
              2. Опис Сервісу<br />
              OwlView — це захищена онлайн-платформа для створення, участі та аналізу соціальних опитувань. Ми впроваджуємо сучасні технології шифрування, контролю доступу та збору статистики для забезпечення надійності й конфіденційності даних.
              <br /><br />
              3. Реєстрація та акаунти<br />
              Для повного доступу до функцій Сервісу потрібна реєстрація. Ви погоджуєтесь надавати достовірну інформацію під час реєстрації, а також зберігати конфіденційність вашого пароля. Ви несете відповідальність за всі дії, що здійснюються з вашого акаунта.
              <br /><br />
              4. Обробка персональних даних<br />
              Ми обробляємо ваші персональні дані відповідно до Політики конфіденційності, яка є невід’ємною частиною цієї Угоди. Зокрема, ми можемо обробляти:
              <br />
              ім’я, електронну адресу, IP-адресу;
              <br />
              відповіді на опитування (які можуть містити чутливу інформацію);
              <br />
              технічні метадані (тип пристрою, браузер тощо).
              <br />
              Ми використовуємо шифрування та контроль доступу для захисту ваших даних.
              <br /><br />
              5. Платні функції<br />
              OwlView пропонує безкоштовний базовий доступ та платні преміум-плани з розширеним функціоналом (аналітика, кастомізація, пріоритетна підтримка тощо). Оплата здійснюється через захищені платіжні шлюзи. Всі оплати є остаточними, якщо інше не передбачено політикою повернення коштів.
              <br /><br />
              6. Інтеграція з третіми сторонами<br />
              Ми можемо надавати доступ до авторизації через Google та використовувати сервіси штучного інтелекту Gemini. Ви погоджуєтесь на передачу певних даних цим сервісам відповідно до їхніх політик конфіденційності.
              <br /><br />
              7. Заборонені дії<br />
              Ви погоджуєтесь не використовувати Сервіс для:
              <br />
              поширення неправдивої чи маніпулятивної інформації;
              <br />
              порушення законодавства України;
              <br />
              спаму, фішингу або шахрайства;
              <br />
              спроби зламати, порушити або обійти захист платформи.
              <br /><br />
              8. Відповідальність<br />
              Сервіс надається «як є». Компанія не несе відповідальності за втрату доступу, переривання у роботі чи пошкодження даних внаслідок дій третіх осіб, технічних збоїв чи неправомірних дій користувачів.
              <br /><br />
              9. Припинення доступу<br />
              Ми залишаємо за собою право призупинити або видалити акаунт користувача в разі порушення умов Угоди або чинного законодавства.
              <br /><br />
              10. Юрисдикція та вирішення спорів<br />
              Ця Угода регулюється законодавством України. Усі спори вирішуються шляхом переговорів, а у випадку неможливості — в порядку, передбаченому законодавством України.
              <br /><br />
              11. Зміни до Угоди<br />
              Ми можемо періодично оновлювати цю Угоду. У разі істотних змін — ми повідомимо про це через Сервіс або на вашу електронну адресу. Продовження використання Сервісу означає вашу згоду з оновленими умовами.
              <br /><br />
              12. Контакти<br />
              Якщо у вас є запитання щодо цієї Угоди, будь ласка, звертайтесь на:<br />
              📧 owlview.ts@gmail.com<br />
              📍 Lviv<br />
            </p>
            <button
              className={styles.closeButton}
              onClick={() => setShowUserAgreement(false)}
            >
              Закрити
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Registration;
