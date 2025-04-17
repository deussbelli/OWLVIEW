import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaFacebookF,
  FaTwitter,
  FaLinkedinIn,
  FaInstagram,
  FaBell,
  FaEnvelope,
  FaUserCircle,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaPlus,
  FaSearch,
  FaChevronRight
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../styles/Footer.module.css";

const Footer = ({ user }) => {
  const navigate = useNavigate();
  const [showPolicy, setShowPolicy] = useState(false);
  const [currentYear] = useState(new Date().getFullYear());
  const [hoveredItem, setHoveredItem] = useState(null);

  const footerLinks = [
    {
      title: "Про компанію",
      links: [
        { name: "Про нас", path: "/about", icon: <FaUserCircle /> },
        { name: "Кар'єра", path: "/career", icon: <FaPlus /> },
        { name: "Політика конфіденційності", action: () => setShowPolicy(true), icon: <FaSearch /> }
      ]
    },
    {
      title: "Продукти",
      links: [
        { name: "Тарифи", path: "/tariffs", icon: <FaBell /> },
        ...(user ? [{ name: "Створити опитування", path: "/survey-editor", icon: <FaPlus /> }] : []),
        { name: "Новини", path: "/news", icon: <FaEnvelope /> }
      ]
    },
    {
      title: "Підтримка",
      links: [
        { name: "Служба підтримки", path: "/support", icon: <FaEnvelope /> },
        { name: "Поширені запитання", path: "/faq", icon: <FaSearch /> },
        { name: "Зв’язатися з нами", path: "/contact", icon: <FaUserCircle /> }
      ]
    },
    {
      title: "Корисні ресурси",
      links: [
        { name: "Блог OwlView", path: "/blog", icon: <FaPlus /> },
        { name: "Посібники", path: "/guides", icon: <FaSearch /> },
        { name: "Документація API", path: "/api-docs", icon: <FaChevronRight /> }
      ]
    }
  ];


  const socialLinks = [
    { icon: <FaFacebookF />, url: "https://facebook.com", label: "Facebook" },
    { icon: <FaTwitter />, url: "https://twitter.com", label: "Twitter" },
    { icon: <FaLinkedinIn />, url: "https://linkedin.com", label: "LinkedIn" },
    { icon: <FaInstagram />, url: "https://instagram.com", label: "Instagram" }
  ];

  return (
    <footer className={styles.footer}>
      <div className={styles.footerWave}></div>

      <div className={styles.footerContainer}>
        <div className={styles.footerTop}>
          {footerLinks.map((section, index) => (
            <div className={styles.footerColumn} key={index}>
              <motion.h4
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                {section.title}
              </motion.h4>
              <ul>
                {section.links.map((link, linkIndex) => (
                  <motion.li
                    key={linkIndex}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 + linkIndex * 0.05 }}
                    onMouseEnter={() => setHoveredItem(`${index}-${linkIndex}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    {link.path ? (
                      <a href={link.path} className={styles.footerLink}>
                        <span className={styles.linkIcon}>{link.icon}</span>
                        <span>{link.name}</span>
                        {hoveredItem === `${index}-${linkIndex}` && (
                          <motion.span
                            className={styles.linkHoverEffect}
                            layoutId="footerLinkHover"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          />
                        )}
                      </a>
                    ) : (
                      <button onClick={link.action} className={styles.footerLink}>
                        <span className={styles.linkIcon}>{link.icon}</span>
                        <span>{link.name}</span>
                        {hoveredItem === `${index}-${linkIndex}` && (
                          <motion.span
                            className={styles.linkHoverEffect}
                            layoutId="footerLinkHover"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          />
                        )}
                      </button>
                    )}
                  </motion.li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={styles.footerBottom}>
          <motion.div
            className={styles.socialMedia}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {socialLinks.map((social, index) => (
              <motion.a
                key={index}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                whileHover={{
                  y: -5,
                  scale: 1.1,
                  backgroundColor: "var(--owl-accent)"
                }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                {social.icon}
              </motion.a>
            ))}
          </motion.div>

          <motion.div
            className={styles.copyright}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            © {currentYear} OwlView Service. Всі права захищені.
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showPolicy && (
          <motion.div
            className={styles.policyModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.policyContent}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
            >
              <h3>
                <FaUserCircle className={styles.iconMargin} />
                Політика конфіденційності
              </h3>
              <p>
                Ми цінуємо вашу довіру та зобов'язуємось захищати вашу особисту інформацію.
                Сервіс OwlView збирає та обробляє лише ті дані, які необхідні для забезпечення
                функціонування платформи, покращення якості послуг та взаємодії з користувачем.
              </p>
              <p>
                Ми можемо збирати наступну інформацію: ім’я, електронну пошту, інформацію профілю,
                відповіді на опитування, статистику та іншу технічну інформацію (наприклад, IP-адресу,
                тип пристрою тощо).
              </p>
              <p>
                Всі дані передаються через зашифровані канали та зберігаються із дотриманням стандартів
                безпеки. Ми не передаємо ваші персональні дані третім особам без вашої явної згоди,
                за винятком випадків, передбачених законодавством України.
              </p>
              <p>
                Користуючись платформою, ви погоджуєтесь із цією політикою та умовами використання.
                Якщо у вас виникнуть питання — зверніться до нашої служби підтримки.
              </p>
              <motion.button
                className={styles.closeButton}
                onClick={() => setShowPolicy(false)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaTimes className={styles.iconMarginRight} />
                Закрити
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </footer>
  );
};

export default Footer;