import React from "react";
import blockedStyles from "../styles/Blocked.module.css";
import { FaLock } from "react-icons/fa";

const Blocked = () => {
  const handleSendEmail = () => {
    window.location.href = "mailto:owlview.ts@gmail.com?subject=Восстановление%20доступа";
  };

  return (
    <div className={blockedStyles.container}>
      <FaLock className={blockedStyles.lockIcon} />
      <h1>Акаунт заблоковано</h1>
      <p>
        На жаль, цей обліковий запис заблокований :( <br />
        Якщо ви бажаєте відновити доступ, надішліть лист на
        <strong>owlview.ts@gmail.com</strong>.
      </p>
      <button
        onClick={handleSendEmail}
        className={blockedStyles.button}
      >
        Надіслати лист
      </button>
    </div>
  );
};

export default Blocked;