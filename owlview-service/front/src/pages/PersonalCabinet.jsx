import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from "../styles/PersonalCabinet.module.css";
import apiClient from "../utils/axiosConfig";
import { useNavigate } from "react-router-dom";

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

const PersonalCabinet = ({ user }) => {
  const [formData, setFormData] = useState({});
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notificationStatus, setNotificationStatus] = useState(0);
  const [isPasswordMatching, setIsPasswordMatching] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  const navigate = useNavigate();

  const checkProfileCompletion = async () => {
    try {
      const { data } = await apiClient.post("/profile-complete", {
        user_id: user.id,
        role: user.role,
      });
      if (data.success) {
        setIsProfileComplete(data.profile_complete);
      }
    } catch (error) {
      console.error("Помилка при перевірці заповнення профілю:", error);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await apiClient.post("/get-profile", {
          user_id: user.id,
          role: user.role,
        });

        const profile = response.data.user;
        setFormData({
          ...profile,
          birth_date: profile.birth_date ? new Date(profile.birth_date) : null,
          organization_registration_date: profile.organization_registration_date
            ? new Date(profile.organization_registration_date)
            : null,
        });
        setNotificationStatus(profile.notification_status);
      } catch (err) {
        console.error("Помилка при завантаженні профілю:", err);
      }
    };

    if (user) {
      fetchUserData();
      checkProfileCompletion();
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormData({
      ...formData,
      [name]: type === "file" ? files[0] : value,
    });
  };

  const handleDateChange = (date, name) => {
    setFormData({ ...formData, [name]: date });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    const updatedPasswordData = { ...passwordData, [name]: value };
    setPasswordData(updatedPasswordData);
    setIsPasswordMatching(
      updatedPasswordData.newPassword === updatedPasswordData.confirmPassword
    );
  };

  const handleSubmit = async () => {
    try {
      const formattedData = {
        ...formData,
        birth_date: formData.birth_date
          ? formData.birth_date.toISOString().split("T")[0]
          : null,
        organization_registration_date: formData.organization_registration_date
          ? formData.organization_registration_date.toISOString().split("T")[0]
          : null,
      };

      const response = await apiClient.post("/update-profile", {
        user_id: user.id,
        role: user.role,
        data: formattedData,
      });

      alert(response.data.message);
      checkProfileCompletion();
    } catch (error) {
      console.error("Помилка при збереженні:", error);
    }
  };

  const handlePasswordUpdate = async () => {
    try {
      if (!passwordData.oldPassword || !isPasswordMatching) {
        alert("Введіть старий пароль та переконайтеся, що нові збігаються.");
        return;
      }

      const response = await apiClient.post("/update-password", {
        user_id: user.id,
        role: user.role,
        old_password: passwordData.oldPassword,
        new_password: passwordData.newPassword,
      });

      alert(response.data.message);
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      console.error("Помилка при оновленні пароля:", error);
    }
  };

  const toggleNotifications = async () => {
    try {
      const newStatus = notificationStatus === 1 ? 0 : 1;
      const response = await apiClient.post("/toggle-notifications", {
        user_id: user.id,
        role: user.role,
        status: newStatus,
      });
      setNotificationStatus(newStatus);
      alert(response.data.message);
    } catch (error) {
      console.error(error);
    }
  };
  const regionOptions = Object.keys(regionCityData);
  const cityOptions =
    formData.region && regionCityData[formData.region]
      ? regionCityData[formData.region]
      : [];

  const renderFieldsByRole = () => {
    if (!user) return null;

    if (user.role === "admin" || user.role === "client") {
      return (
        <div className={user.role === "client" ? styles.clientFields : ""}>
          <InputField
            name="name"
            label="Ім’я"
            value={formData.name || ""}
            onChange={handleChange}
          />
          <InputField
            name="surname"
            label="Прізвище"
            value={formData.surname || ""}
            onChange={handleChange}
          />

          <SelectField
            name="gender"
            label="Гендер"
            options={genders}
            value={formData.gender || ""}
            onChange={handleChange}
          />

          <DatePickerField
            name="birth_date"
            label="Дата народження"
            selected={formData.birth_date}
            onChange={(date) => handleDateChange(date, "birth_date")}
          />

          <InputField
            name="phone_number"
            label="Телефон"
            value={formData.phone_number || ""}
            onChange={handleChange}
          />

          <SelectField
            name="country"
            label="Країна"
            options={countries}
            value={formData.country || ""}
            onChange={handleChange}
          />

          <SelectField
            name="region"
            label="Область"
            options={regionOptions}
            value={formData.region || ""}
            onChange={handleChange}
          />

          <SelectField
            name="city"
            label="Населений пункт"
            options={cityOptions}
            value={formData.city || ""}
            onChange={handleChange}
          />
          <SelectField
            name="relationship_status"
            label="Сімейний стан"
            options={relationshipOptions}
            value={formData.relationship_status || ""}
            onChange={handleChange}
          />
          <SelectField
            name="attitude_to_smoking"
            label="Ставлення до куріння"
            options={attitudeOptions}
            value={formData.attitude_to_smoking || ""}
            onChange={handleChange}
          />
          <SelectField
            name="attitude_to_alcohol"
            label="Ставлення до алкоголю"
            options={attitudeOptions}
            value={formData.attitude_to_alcohol || ""}
            onChange={handleChange}
          />
          <SelectField
            name="attitude_to_drugs"
            label="Ставлення до наркотиків"
            options={attitudeOptions}
            value={formData.attitude_to_drugs || ""}
            onChange={handleChange}
          />
          <SelectField
            name="education"
            label="Освіта"
            options={educationOptions}
            value={formData.education || ""}
            onChange={handleChange}
          />
          <SelectField
            name="occupation"
            label="Рід занять"
            options={occupationOptions}
            value={formData.occupation || ""}
            onChange={handleChange}
          />
        </div>
      );
    } else if (user.role === "organization") {
      const orgRegDate = formData.organization_registration_date;
      return (
        <div className={styles.organizationFields}>
          <InputField
            name="organization_name"
            label="Назва організації"
            value={formData.organization_name || ""}
            onChange={handleChange}
          />
          <InputField
            name="organization_phone_number"
            label="Телефон організації"
            value={formData.organization_phone_number || ""}
            onChange={handleChange}
          />
          <InputField
            name="organization_website"
            label="Сайт організації"
            value={formData.organization_website || ""}
            onChange={handleChange}
          />
          <InputField
            name="organization_head_name"
            label="Ім’я керівника"
            value={formData.organization_head_name || ""}
            onChange={handleChange}
          />
          <InputField
            name="organization_head_surname"
            label="Прізвище керівника"
            value={formData.organization_head_surname || ""}
            onChange={handleChange}
          />
          <SelectField
            name="organization_head_gender"
            label="Гендер керівника"
            options={genders}
            value={formData.organization_head_gender || ""}
            onChange={handleChange}
          />
          <SelectField
            name="country"
            label="Країна"
            options={countries}
            value={formData.country || ""}
            onChange={handleChange}
          />
          <SelectField
            name="region"
            label="Область"
            options={regionOptions}
            value={formData.region || ""}
            onChange={handleChange}
          />
          <SelectField
            name="city"
            label="Населений пункт"
            options={cityOptions}
            value={formData.city || ""}
            onChange={handleChange}
          />

          <DatePickerField
            name="organization_registration_date"
            label="Дата реєстрації організації"
            selected={orgRegDate}
            onChange={(date) => handleDateChange(date, "organization_registration_date")}
          />

          <InputField
            name="organization_type"
            label="Тип організації"
            value={formData.organization_type || ""}
            onChange={handleChange}
          />
          <InputField
            name="number_of_employees"
            label="Кількість співробітників"
            value={formData.number_of_employees || ""}
            onChange={handleChange}
          />
          <InputField
            name="organization_registration_goal"
            label="Мета реєстрації"
            value={formData.organization_registration_goal || ""}
            onChange={handleChange}
          />

          <InputField
            name="social_links_Instagram"
            label="Instagram"
            value={formData.social_links_Instagram || ""}
            onChange={handleChange}
          />
          <InputField
            name="social_links_Facebook"
            label="Facebook"
            value={formData.social_links_Facebook || ""}
            onChange={handleChange}
          />
          <InputField
            name="social_links_Discord"
            label="Discord"
            value={formData.social_links_Discord || ""}
            onChange={handleChange}
          />
          <InputField
            name="social_links_Telegram"
            label="Telegram"
            value={formData.social_links_Telegram || ""}
            onChange={handleChange}
          />
        </div>
      );
    } else {
      return null;
    }
  };

  return (
    <div className={styles.container}>
      <h1>Особистий кабінет</h1>

      <form className={styles.form}>
        {renderFieldsByRole()}
        <button type="button" className={styles.button} onClick={handleSubmit}>
          Зберегти зміни
        </button>
      </form>

      <div className={styles.passwordSection}>
        <h2>Зміна пароля</h2>
        <InputField
          name="oldPassword"
          label="Старий пароль"
          value={passwordData.oldPassword}
          onChange={handlePasswordChange}
          type="password"
        />
        <InputField
          name="newPassword"
          label="Новий пароль"
          value={passwordData.newPassword}
          onChange={handlePasswordChange}
          type="password"
        />
        <InputField
          name="confirmPassword"
          label="Підтвердіть пароль"
          value={passwordData.confirmPassword}
          onChange={handlePasswordChange}
          type="password"
        />
        {!isPasswordMatching && passwordData.confirmPassword.length > 0 && (
          <p className={styles.passwordError}>
            Паролі не співпадають. Перевірте правильність введення.
          </p>
        )}
        <button
          type="button"
          className={styles.button}
          onClick={handlePasswordUpdate}
          disabled={!isPasswordMatching}
        >
          Оновити пароль
        </button>
      </div>

      <div className={styles.notificationToggle}>
        <span>
          Сповіщення: {notificationStatus === 1 ? "Увімкнені" : "Вимкнені"}
        </span>
        <label className={styles.toggleButton}>
          <input
            type="checkbox"
            checked={notificationStatus === 1}
            onChange={toggleNotifications}
          />
          <span className={styles.toggleSlider}></span>
        </label>
      </div>
    </div>
  );
};

const InputField = ({ name, label, value, onChange, type = "text" }) => (
  <div className={styles.formGroup}>
    <label>{label}</label>
    <input type={type} name={name} value={value} onChange={onChange} />
  </div>
);

const SelectField = ({ name, label, options, value, onChange }) => (
  <div className={styles.formGroup}>
    <label>{label}</label>
    <select name={name} value={value} onChange={onChange}>
      <option value="">-- обрати --</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);

const DatePickerField = ({ name, label, selected, onChange }) => (
  <div className={styles.formGroup}>
    <label>{label}</label>
    <DatePicker
      selected={selected}
      onChange={onChange}
      dateFormat="yyyy-MM-dd"
      className={styles.datepicker}
      placeholderText="Оберіть дату"
    />
  </div>
);

export default PersonalCabinet;
