import React, { useState, useEffect } from 'react';
import apiClient from '../utils/axiosConfig';
import styles from '../styles/Support.module.css';

const Support = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [tab, setTab] = useState('inbox');
  const [newMessage, setNewMessage] = useState({
    recipientId: '',
    subject: '',
    text: ''
  });
  const [showNewMessageForm, setShowNewMessageForm] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchMessages(tab);
  }, [tab]);

  const fetchMessages = async (folder) => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/support/messages?folder=${folder}`);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Помилка при завантаженні повідомлень:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setSelectedMessage(null);
  };

  const handleViewMessage = (message) => {
    setSelectedMessage(message);
  };

  const handleCloseMessage = async () => {
    if (selectedMessage) {
      if (tab === 'inbox') {
        try {
          await apiClient.post('/support/update_status', {
            id: selectedMessage.id,
            status: 'read'
          });
          setMessages((prev) => prev.filter((msg) => msg.id !== selectedMessage.id));
        } catch (error) {
          console.error('Помилка при маркуванні повідомлення як прочитаного:', error);
        }
      }
      setSelectedMessage(null);
    }
  };

  const handlePostponeMessage = async () => {
    if (selectedMessage) {
      try {
        await apiClient.post('/support/postpone', { id: selectedMessage.id });
        setMessages((prev) => prev.filter((msg) => msg.id !== selectedMessage.id));
      } catch (error) {
        console.error('Помилка при відкладанні повідомлення:', error);
      }
      setSelectedMessage(null);
    }
  };

  const handleReplyClick = () => {
    if (!selectedMessage) return;

    setNewMessage({
      recipientId: selectedMessage.senderEmail || '',
      subject: `RE: ${selectedMessage.subject || ''}`,
      text: ''
    });

    setReplyToMessage(selectedMessage);
    setShowNewMessageForm(true);
    setSelectedMessage(null);
  };

  const handleWriteMessageClick = () => {
    setNewMessage({ recipientId: '', subject: '', text: '' });
    setReplyToMessage(null);
    setShowNewMessageForm(true);
  };

  const handleSendMessage = async () => {
    const { recipientId, subject, text } = newMessage;
    if (!recipientId.trim() || !subject.trim() || !text.trim()) {
      alert("Будь ласка, заповніть усі поля: одержувач, тема, текст");
      return;
    }

    try {
      if (replyToMessage) {
        await apiClient.post('/support/reply', {
          recipient_id: recipientId,
          subject: subject,
          text: text,
          original_message_id: replyToMessage.id
        });
        alert("Відповідь успішно відправлено!");
      } else {
        await apiClient.post('/support/send', {
          recipientId: recipientId,
          subject: subject,
          text: text
        });
        alert("Повідомлення успішно відправлено!");
      }

      setShowNewMessageForm(false);
      setNewMessage({ recipientId: '', subject: '', text: '' });
      setReplyToMessage(null);
      fetchMessages(tab);

    } catch (error) {
      console.error('Помилка при надсиланні повідомлення:', error);
      alert("Не вдалося надіслати повідомлення!");
    }
  };

  const handleDelete = async (messageId) => {
    try {
      await apiClient.post('/support/delete', { id: messageId });
      fetchMessages(tab);
    } catch (error) {
      console.error('Помилка при видаленні повідомлення:', error);
    }
  };

  return (
    <div className={styles.supportContainer}>

      <h2>Технічна підтримка</h2>
      <div className={styles.tabs}>
        <button
          onClick={() => handleTabChange('inbox')}
          className={tab === 'inbox' ? styles.activeTab : ''}>
          Вхідні
        </button>
        <button
          onClick={() => handleTabChange('outbox')}
          className={tab === 'outbox' ? styles.activeTab : ''}>
          Вихідні
        </button>
        <button
          onClick={() => handleTabChange('postponed')}
          className={tab === 'postponed' ? styles.activeTab : ''}>
          Відкладені
        </button>
        <button
          onClick={() => handleTabChange('deleted')}
          className={tab === 'deleted' ? styles.activeTab : ''}>
          Видалені
        </button>
        <button
          onClick={() => handleTabChange('read')}
          className={tab === 'read' ? styles.activeTab : ''}>
          Прочитані
        </button>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Завантаження повідомлень...</div>
      ) : (
        <div className={styles.messageList}>
          {messages.length > 0 ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={styles.messageItem}
                onClick={() => handleViewMessage(message)}>
                <span>Дата: {message.date}</span>
                <span>Відправник: {message.senderEmail}</span>
                <span>Отримувач: {message.recipientEmail}</span>
                <span>Тема: {message.subject}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(message.id);
                  }}>
                  Удалить
                </button>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>Немає повідомлень на цій вкладинці</div>
          )}
        </div>
      )}

      {selectedMessage && (
        <>
          <div
            className={styles.popupOverlay}
            onClick={handleCloseMessage}
          />
          <div className={styles.messagePopup}>
            <h3>{selectedMessage.subject}</h3>
            <p>{selectedMessage.text}</p>
            <p><strong>Відправник:</strong> {selectedMessage.senderEmail}</p>
            <p><strong>Отримувач:</strong> {selectedMessage.recipientEmail}</p>
            <p><strong>Дата:</strong> {selectedMessage.date}</p>
            <div>
              <button onClick={handleReplyClick}>Відповісти</button>
              {tab === 'inbox' && (
                <button onClick={handlePostponeMessage}>Відкласти</button>
              )}
              <button onClick={handleCloseMessage}>Закрити</button>
            </div>
          </div>
        </>
      )}

      {showNewMessageForm && (
        <>
          <div
            className={styles.popupOverlay}
            onClick={() => setShowNewMessageForm(false)}
          />
          <div className={styles.newMessageForm}>
            <h3>{replyToMessage ? 'Відповідь на повідомлення' : 'Нове повідомлення'}</h3>
            <input
              type="text"
              placeholder="ID чи email отримувачм"
              value={newMessage.recipientId}
              onChange={(e) => setNewMessage({ ...newMessage, recipientId: e.target.value })}
              readOnly={!!replyToMessage}
            />
            <input
              type="text"
              placeholder="Тема"
              value={newMessage.subject}
              onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
            />
            <textarea
              placeholder="Текуст повідомлення"
              value={newMessage.text}
              onChange={(e) => setNewMessage({ ...newMessage, text: e.target.value })}
            />
            <div>
              <button onClick={handleSendMessage}>Надіслати</button>
              <button onClick={() => setShowNewMessageForm(false)}>Скасувати</button>
            </div>
          </div>
        </>
      )}

      {!showNewMessageForm && (
        <button
          className={styles.writeMessageButton}
          onClick={handleWriteMessageClick}>
          Створити повідомлення
        </button>
      )}
    </div>
  );
};

export default Support;