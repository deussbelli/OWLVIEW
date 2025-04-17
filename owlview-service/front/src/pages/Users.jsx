import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Users.module.css";
import apiClient from "../utils/axiosConfig";

import {
  countries,
  regionCityData,
  genders,
  relationshipOptions,
  attitudeOptions,
  educationOptions,
  occupationOptions,
  organizationTypeOptions,
  employeesOptions
} from "../data/data";

const Users = ({ user }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const [allUsers, setAllUsers] = useState([]);

  const [filterDateRegEnabled, setFilterDateRegEnabled] = useState(false);
  const [dateRegFrom, setDateRegFrom] = useState("");
  const [dateRegTo, setDateRegTo] = useState("");

  const [filterAgeEnabled, setFilterAgeEnabled] = useState(false);
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");

  const [filterRatingEnabled, setFilterRatingEnabled] = useState(false);
  const [filterRatingValue, setFilterRatingValue] = useState("");

  const [filterStatusEnabled, setFilterStatusEnabled] = useState(false);
  const [filterStatusValue, setFilterStatusValue] = useState("разблокований");

  const [filterGenderEnabled, setFilterGenderEnabled] = useState(false);
  const [filterGenderValue, setFilterGenderValue] = useState("чоловік");
  const [filterRelationshipEnabled, setFilterRelationshipEnabled] = useState(false);
  const [filterRelationshipValue, setFilterRelationshipValue] = useState("Свободен");

  const [filterCountryEnabled, setFilterCountryEnabled] = useState(false);
  const [filterCountryValue, setFilterCountryValue] = useState("Україна");

  const [filterRegionValue, setFilterRegionValue] = useState("Вінницька");
  const [filterCityValue, setFilterCityValue] = useState("Вінниця");

  const [filterSmokingEnabled, setFilterSmokingEnabled] = useState(false);
  const [filterSmokingValue, setFilterSmokingValue] = useState("нейтральное");

  const [filterAlcoholEnabled, setFilterAlcoholEnabled] = useState(false);
  const [filterAlcoholValue, setFilterAlcoholValue] = useState("нейтральное");

  const [filterDrugsEnabled, setFilterDrugsEnabled] = useState(false);
  const [filterDrugsValue, setFilterDrugsValue] = useState("нейтральное");

  const [filterEduEnabled, setFilterEduEnabled] = useState(false);
  const [filterEduValue, setFilterEduValue] = useState("без освіти");

  const [filterOccupationEnabled, setFilterOccupationEnabled] = useState(false);
  const [filterOccupationValue, setFilterOccupationValue] = useState("Фронтенд-розробник");

  const [filterOrgTypeEnabled, setFilterOrgTypeEnabled] = useState(false);
  const [filterOrgTypeValue, setFilterOrgTypeValue] = useState("IT-компанія");

  const [filterNumEmpEnabled, setFilterNumEmpEnabled] = useState(false);
  const [filterNumEmpValue, setFilterNumEmpValue] = useState("5-10");

  const [filterRoleEnabled, setFilterRoleEnabled] = useState(false);
  const [filterRoleValue, setFilterRoleValue] = useState("admin");

  const [searchMethod, setSearchMethod] = useState("id");
  const [searchQuery, setSearchQuery] = useState("");

  const [blockPopupOpen, setBlockPopupOpen] = useState(false);
  const [blockUserId, setBlockUserId] = useState(null);
  const [blockEndDate, setBlockEndDate] = useState("");
  const [blockEndTime, setBlockEndTime] = useState("");
  const [blockReason, setBlockReason] = useState("");

  const [unblockPopupOpen, setUnblockPopupOpen] = useState(false);
  const [unblockUserId, setUnblockUserId] = useState(null);
  const [autoUnblockDateTime, setAutoUnblockDateTime] = useState("");
  const [unblockReason, setUnblockReason] = useState("");
  const [unblockWhoBlocked, setUnblockWhoBlocked] = useState(null);
  const [unblockBlockDate, setUnblockBlockDate] = useState("");
  const [unblockBlockTime, setUnblockBlockTime] = useState("");

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      const response = await apiClient.get("/users");
      console.log(response.data);
      if (response.data.success) {
        const mapped = response.data.users.map((u) => {
          let status = "разблокований";
          if (u.is_blocked == 2 || u.is_blocked == 1) status = "заблокований";
          if (u.is_deleted == 1) status = "видалений";
          return {
            ...u,
            status,
            block_until: u.block_until || "",
          };
        });
        setAllUsers(mapped);
      } else {
        alert("Помилка при отриманні користувачів:" + response.data.message);
      }
    } catch (err) {
      console.error("Помилка мережі при отриманні користувачів:", err);
      alert("Помилка мережі при отриманні користувачів");
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const resp = await apiClient.post("/users/delete", { userId });
      if (resp.data.success) {
        alert("Користувач видалений");
        fetchAllUsers();
      } else {
        alert("Помилка при видаленні:" + resp.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Помилка мережі при видаленні");
    }
  };

  const handleMakeAdmin = async (userId) => {
    try {
      const resp = await apiClient.post("/users/make_admin", { userId });
      if (resp.data.success) {
        alert("Користувач призначений адміном");
        fetchAllUsers();
      } else {
        alert("Помилка при призначенні адміном:" + resp.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Помилка мережі при призначенні адміном");
    }
  };

  const handleRemoveAdmin = async (userId) => {
    try {
      const resp = await apiClient.post("/users/remove_admin", { userId });
      if (resp.data.success) {
        alert("Роль адміністратора знята");
        fetchAllUsers();
      } else {
        alert("Помилка при знятті ролі адміністратора:" + resp.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Помилка мережі при знятті ролі адміністратора");
    }
  };

  const handleBlockUser = (userId) => {
    setBlockUserId(userId);
    setBlockEndDate("");
    setBlockEndTime("");
    setBlockReason("");
    setBlockPopupOpen(true);
  };

  const handleConfirmBlock = async () => {
    try {
      await apiClient.post("/users/block", {
        userId: blockUserId,
        whoBlockedId: user.id,
        endDate: blockEndDate,
        endTime: blockEndTime,
        reason: blockReason,
      });
      alert("Користувач заблокований");
      setBlockPopupOpen(false);
      fetchAllUsers();
    } catch (err) {
      console.error(err);
      alert("Помилка при блокуванні");
    }
  };

  const handleUnblockUser = (userId) => {
    setUnblockUserId(userId);

    const found = allUsers.find((u) => u.id === userId);
    if (found) {
      setAutoUnblockDateTime(
        found.end_date && found.end_time
          ? `${found.end_date} ${found.end_time}`
          : ""
      );
      setUnblockReason(found.block_reason || "");
      setUnblockWhoBlocked(found.who_blocked || null);
      setUnblockBlockDate(found.block_date || "");
      setUnblockBlockTime(found.block_time || "");
    }

    setUnblockPopupOpen(true);
  };

  const handleConfirmUnblock = async () => {
    try {
      await apiClient.post("/users/unblock", { userId: unblockUserId });
      alert("Користувач разблокований");
      setUnblockPopupOpen(false);
      fetchAllUsers();
    } catch (err) {
      console.error(err);
      alert("Помилка при розблокуванні");
    }
  };

  const calcAge = (birthDateString) => {
    if (!birthDateString) return null;
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getFilteredUsers = () => {
    let filtered = [...allUsers];

    if (filterRoleEnabled && user?.role === "admin") {
      filtered = filtered.filter((u) => u.role === filterRoleValue);
    } else if (filterRoleEnabled && user?.role === "organization") {
      filtered = filtered.filter((u) => u.role === filterRoleValue);
    }

    if (filterDateRegEnabled && dateRegFrom && dateRegTo) {
      filtered = filtered.filter((u) => {
        return (
          u.registrationDate >= dateRegFrom && u.registrationDate <= dateRegTo
        );
      });
    }

    if (filterAgeEnabled && ageMin && ageMax) {
      filtered = filtered.filter((u) => {
        const age = calcAge(u.birth_date);
        return age !== null && age >= +ageMin && age <= +ageMax;
      });
    }

    if (filterRatingEnabled && filterRatingValue.trim() !== "") {
      filtered = filtered.filter((u) => (u.rating || 0) >= +filterRatingValue);
    }

    if (filterStatusEnabled) {
      filtered = filtered.filter((u) => u.status === filterStatusValue);
    }

    if (filterGenderEnabled) {
      filtered = filtered.filter((u) => u.gender === filterGenderValue);
    }

    if (filterRelationshipEnabled) {
      filtered = filtered.filter(
        (u) => u.relationship_status === filterRelationshipValue
      );
    }

    if (filterCountryEnabled) {
      filtered = filtered.filter((u) => {
        return (
          u.country === filterCountryValue &&
          u.region === filterRegionValue &&
          u.city === filterCityValue
        );
      });
    }

    if (filterSmokingEnabled) {
      filtered = filtered.filter(
        (u) => u.attitude_to_smoking === filterSmokingValue
      );
    }

    if (filterAlcoholEnabled) {
      filtered = filtered.filter(
        (u) => u.attitude_to_alcohol === filterAlcoholValue
      );
    }

    if (filterDrugsEnabled) {
      filtered = filtered.filter(
        (u) => u.attitude_to_drugs === filterDrugsValue
      );
    }

    if (filterEduEnabled) {
      filtered = filtered.filter((u) => u.education === filterEduValue);
    }

    if (filterOccupationEnabled) {
      filtered = filtered.filter((u) => u.occupation === filterOccupationValue);
    }

    if (filterOrgTypeEnabled) {
      filtered = filtered.filter(
        (u) => u.organization_type === filterOrgTypeValue
      );
    }

    if (filterNumEmpEnabled) {
      filtered = filtered.filter(
        (u) => u.number_of_employees === filterNumEmpValue
      );
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter((u) => {
        switch (searchMethod) {
          case "id":
            return String(u.id).includes(searchQuery);
          case "name":
            return (
              (u.name && u.name.includes(searchQuery)) ||
              (u.organization_name && u.organization_name.includes(searchQuery))
            );
          case "orgName":
            return u.organization_name?.includes(searchQuery);
          case "email":
            return u.email?.includes(searchQuery);
          case "phone":
            return u.phone?.includes(searchQuery);
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  const handleDownload = () => {
    const ids = filteredUsers.map((u) => u.id).join(",");
    const blob = new Blob([ids], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "filtered_users.txt";
    link.click();

    URL.revokeObjectURL(url);
  };

  const renderTable = () => {
    if (user?.role === "admin") {
      return (
        <table className={styles.usersTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Дата реєстрації</th>
              <th>Роль</th>
              <th>Гендер</th>
              <th>Рейтинг</th>
              <th>Бали</th>
              <th>Email</th>
              <th>VIP</th>
              <th>2FA</th>
              <th>Статус</th>
              <th>Управління</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.registration_date || "-"}</td>
                <td>{u.role}</td>
                <td>{u.gender || u.organization_head_gender || "-"}</td>
                <td>{u.rating}</td>
                <td>{u.points}</td>
                <td>{u.email}</td>
                <td>{u.vip ? "1" : "0"}</td>
                <td>{u.is_verified ? "Включено" : "Виключено"}</td>
                <td>{u.status}</td>
                <td>
                  <button onClick={() => handleDeleteUser(u.id)}>Видалити</button>
                  {u.role === "client" && (
                    <button onClick={() => handleMakeAdmin(u.id)}>
                      Призначити адміністратором
                    </button>
                  )}
                  {u.role === "admin" && (
                    <button onClick={() => handleRemoveAdmin(u.id)}>
                      Розжалувати адміністратора
                    </button>
                  )}
                  {u.status === "разблокований" && (
                    <button onClick={() => handleBlockUser(u.id)}>
                      Заблокувати
                    </button>
                  )}
                  {u.status === "заблокований" && (
                    <button onClick={() => handleUnblockUser(u.id)}>
                      Розблокувати
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else if (user?.role === "client") {
      return (
        <table className={styles.usersTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Дата реєстрації</th>
              <th>Роль (client)</th>
              <th>Гендер</th>
              <th>Рейтинг</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers
              .filter((u) => u.role === "client")
              .map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.registration_date || "-"}</td>
                  <td>{u.role}</td>
                  <td>{u.gender || u.organization_head_gender || "-"}</td>
                  <td>{u.rating}</td>
                </tr>
              ))}
          </tbody>
        </table>
      );
    } else if (user?.role === "organization") {
      return (
        <table className={styles.usersTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Дата реєстрації</th>
              <th>Роль (client|org)</th>
              <th>Гендер</th>
              <th>Рейтинг</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers
              .filter((u) => u.role === "client" || u.role === "organization")
              .map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.registration_date || "-"}</td>
                  <td>{u.role}</td>
                  <td>{u.gender || u.organization_head_gender || "-"}</td>
                  <td>{u.rating}</td>
                </tr>
              ))}
          </tbody>
        </table>
      );
    } else {
      return <p>Невідома роль</p>;
    }
  };

  const renderFilters = () => {
    const regionOptions = Object.keys(regionCityData);
    const cityOptions = regionCityData[filterRegionValue] || [];

    return (
      <div className={styles.filtersContainer}>
        <h3>Фільтри</h3>

        {user?.role === "admin" && (
          <div>
            <input
              type="checkbox"
              checked={filterRoleEnabled}
              onChange={() => setFilterRoleEnabled(!filterRoleEnabled)}
            />
            <label>Роль</label>
            {filterRoleEnabled && (
              <select
                value={filterRoleValue}
                onChange={(e) => setFilterRoleValue(e.target.value)}
              >
                <option value="admin">адміністратор</option>
                <option value="client">клієнт</option>
                <option value="organization">організація</option>
              </select>
            )}
          </div>
        )}

        {user?.role === "organization" && (
          <div>
            <input
              type="checkbox"
              checked={filterRoleEnabled}
              onChange={() => setFilterRoleEnabled(!filterRoleEnabled)}
            />
            <label>Роль</label>
            {filterRoleEnabled && (
              <select
                value={filterRoleValue}
                onChange={(e) => setFilterRoleValue(e.target.value)}
              >
                <option value="client">клієнт</option>
                <option value="organization">організація</option>
              </select>
            )}
          </div>
        )}

        <div>
          <input
            type="checkbox"
            checked={filterDateRegEnabled}
            onChange={() => setFilterDateRegEnabled(!filterDateRegEnabled)}
          />
          <label>Дата реєстрації</label>
          {filterDateRegEnabled && (
            <div>
              <input
                type="date"
                value={dateRegFrom}
                onChange={(e) => setDateRegFrom(e.target.value)}
              />
              <input
                type="date"
                value={dateRegTo}
                onChange={(e) => setDateRegTo(e.target.value)}
              />
            </div>
          )}
        </div>

        <div>
          <input
            type="checkbox"
            checked={filterAgeEnabled}
            onChange={() => setFilterAgeEnabled(!filterAgeEnabled)}
          />
          <label> Вік</label>
          {filterAgeEnabled && (
            <div>
              <input
                type="number"
                placeholder="Від"
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
              />
              <input
                type="number"
                placeholder="До"
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
              />
            </div>
          )}
        </div>
        <div>
          <input
            type="checkbox"
            checked={filterRatingEnabled}
            onChange={() => setFilterRatingEnabled(!filterRatingEnabled)}
          />
          <label>Рейтинг</label>
          {filterRatingEnabled && (
            <input
              type="number"
              placeholder="Від"
              value={filterRatingValue}
              onChange={(e) => setFilterRatingValue(e.target.value)}
            />
          )}
        </div>

        <div>
          <input
            type="checkbox"
            checked={filterStatusEnabled}
            onChange={() => setFilterStatusEnabled(!filterStatusEnabled)}
          />
          <label>Статус користувача</label>
          {filterStatusEnabled && (
            <select
              value={filterStatusValue}
              onChange={(e) => setFilterStatusValue(e.target.value)}
            >
              <option value="разблокований">разблокований</option>
              <option value="заблокований">заблокований</option>
              <option value="удален">удален</option>
            </select>
          )}
        </div>

        <div>
          <input
            type="checkbox"
            checked={filterGenderEnabled}
            onChange={() => setFilterGenderEnabled(!filterGenderEnabled)}
          />
          <label>Гендер</label>
          {filterGenderEnabled && (
            <select
              value={filterGenderValue}
              onChange={(e) => setFilterGenderValue(e.target.value)}
            >
              {genders.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <input
            type="checkbox"
            checked={filterRelationshipEnabled}
            onChange={() =>
              setFilterRelationshipEnabled(!filterRelationshipEnabled)
            }
          />
          <label>Статус стосунків</label>
          {filterRelationshipEnabled && (
            <select
              value={filterRelationshipValue}
              onChange={(e) => setFilterRelationshipValue(e.target.value)}
            >
              {relationshipOptions.map((rel) => (
                <option key={rel} value={rel}>
                  {rel}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <input
            type="checkbox"
            checked={filterCountryEnabled}
            onChange={() => setFilterCountryEnabled(!filterCountryEnabled)}
          />
          <label>Локація</label>
          {filterCountryEnabled && (
            <div>
              <select
                value={filterCountryValue}
                onChange={(e) => setFilterCountryValue(e.target.value)}
              >
                {countries.map((cnt) => (
                  <option key={cnt} value={cnt}>
                    {cnt}
                  </option>
                ))}
              </select>

              <select
                value={filterRegionValue}
                onChange={(e) => {
                  setFilterRegionValue(e.target.value);
                  setFilterCityValue("");
                }}
              >
                {regionOptions.map((reg) => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>

              <select
                value={filterCityValue}
                onChange={(e) => setFilterCityValue(e.target.value)}
              >
                <option value="">-- Місто --</option>
                {cityOptions.map((ct) => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <input
            type="checkbox"
            checked={filterSmokingEnabled}
            onChange={() => setFilterSmokingEnabled(!filterSmokingEnabled)}
          />
          <label>Ставлення до куріння</label>
          {filterSmokingEnabled && (
            <select
              value={filterSmokingValue}
              onChange={(e) => setFilterSmokingValue(e.target.value)}
            >
              {attitudeOptions.map((att) => (
                <option key={att} value={att}>
                  {att}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <input
            type="checkbox"
            checked={filterAlcoholEnabled}
            onChange={() => setFilterAlcoholEnabled(!filterAlcoholEnabled)}
          />
          <label>Ставлення до алкоголю</label>
          {filterAlcoholEnabled && (
            <select
              value={filterAlcoholValue}
              onChange={(e) => setFilterAlcoholValue(e.target.value)}
            >
              {attitudeOptions.map((att) => (
                <option key={att} value={att}>
                  {att}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <input
            type="checkbox"
            checked={filterDrugsEnabled}
            onChange={() => setFilterDrugsEnabled(!filterDrugsEnabled)}
          />
          <label>Ставлення до наркотиків</label>
          {filterDrugsEnabled && (
            <select
              value={filterDrugsValue}
              onChange={(e) => setFilterDrugsValue(e.target.value)}
            >
              {attitudeOptions.map((att) => (
                <option key={att} value={att}>
                  {att}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <input
            type="checkbox"
            checked={filterEduEnabled}
            onChange={() => setFilterEduEnabled(!filterEduEnabled)}
          />
          <label>Освіта</label>
          {filterEduEnabled && (
            <select
              value={filterEduValue}
              onChange={(e) => setFilterEduValue(e.target.value)}
            >
              {educationOptions.map((edu) => (
                <option key={edu} value={edu}>
                  {edu}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <input
            type="checkbox"
            checked={filterOccupationEnabled}
            onChange={() => setFilterOccupationEnabled(!filterOccupationEnabled)}
          />
          <label>Професія</label>
          {filterOccupationEnabled && (
            <select
              value={filterOccupationValue}
              onChange={(e) => setFilterOccupationValue(e.target.value)}
            >
              {occupationOptions.map((occ) => (
                <option key={occ} value={occ}>
                  {occ}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <input
            type="checkbox"
            checked={filterOrgTypeEnabled}
            onChange={() => setFilterOrgTypeEnabled(!filterOrgTypeEnabled)}
          />
          <label>Сфера діяльності (тип) організації</label>
          {filterOrgTypeEnabled && (
            <select
              value={filterOrgTypeValue}
              onChange={(e) => setFilterOrgTypeValue(e.target.value)}
            >
              {organizationTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <input
            type="checkbox"
            checked={filterNumEmpEnabled}
            onChange={() => setFilterNumEmpEnabled(!filterNumEmpEnabled)}
          />
          <label>Кількість співробітників</label>
          {filterNumEmpEnabled && (
            <select
              value={filterNumEmpValue}
              onChange={(e) => setFilterNumEmpValue(e.target.value)}
            >
              {employeesOptions.map((emp) => (
                <option key={emp} value={emp}>
                  {emp}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    );
  };

  const renderSearch = () => {
    return (
      <div className={styles.searchContainer}>
        <h3>Пошук</h3>
        <select
          value={searchMethod}
          onChange={(e) => setSearchMethod(e.target.value)}
        >
          <option value="id">За ID</option>
          <option value="name">На ім'я</option>
          <option value="orgName">За назвою організації</option>
          <option value="email">Поштою</option>
          <option value="phone">Телефоном</option>
        </select>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Ваш запит..."
        />
        <button>Пошук</button>
      </div>
    );
  };

  return (
    <div className={styles.usersContainer}>
      <h1>Користувачі</h1>

      <div className={styles.filtersRow}>
        {renderFilters()}
        {user?.role === "admin" && renderSearch()}
      </div>

      <button onClick={handleDownload} className={styles.downloadButton}>
        Завантажити ID
      </button>

      <div className={styles.tableWrapper}>{renderTable()}</div>

      {blockPopupOpen && (
        <div className={styles.popupBackdrop}>
          <div className={styles.popup}>
            <h2>Заблокувати користувача #{blockUserId}</h2>
            <label>Дата завершення блокування</label>
            <input
              type="date"
              value={blockEndDate}
              onChange={(e) => setBlockEndDate(e.target.value)}
            />
            <label>Час завершення блокування</label>
            <input
              type="time"
              value={blockEndTime}
              onChange={(e) => setBlockEndTime(e.target.value)}
            />
            <label>Причина блокування</label>
            <textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Вкажіть причину блокування..."
            />
            <div className={styles.popupButtons}>
              <button onClick={() => setBlockPopupOpen(false)}>Скасувати</button>
              <button onClick={handleConfirmBlock}>Підтвердити</button>
            </div>
          </div>
        </div>
      )}

      {unblockPopupOpen && (
        <div className={styles.popupBackdrop}>
          <div className={styles.popup}>
            <h2>Розблокувати користувача #{unblockUserId}</h2>
            <div className={styles.popupInfo}>
              <p>
                <strong>Хто заблокував:</strong>{" "}
                {unblockWhoBlocked ? `ID ${unblockWhoBlocked}` : "Невідомо"}
              </p>
              <p>
                <strong>Коли заблокував:</strong> {unblockBlockDate}{" "}
                {unblockBlockTime}
              </p>
              <p>
                <strong>Причина блокування:</strong>{" "}
                {unblockReason || "не вказана"}
              </p>
              {autoUnblockDateTime ? (
                <p>
                  <strong>Авторозблокування:</strong> {autoUnblockDateTime}
                </p>
              ) : (
                <p>
                  <strong>Авторозблокування не зазначено</strong>
                </p>
              )}
            </div>
            <p>Розблокувати зараз?</p>
            <div className={styles.popupButtons}>
              <button onClick={() => setUnblockPopupOpen(false)}>Скасувати</button>
              <button onClick={handleConfirmUnblock}>Підтвердити</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
