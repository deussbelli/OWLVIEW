import React, { useState } from "react";
import axios from "axios";
import styles from "../styles/ArtificialIntelligenceTab.module.css";

function ArtificialIntelligenceTab({ surveyID }) {
    const [messages, setMessages] = useState([]);
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!prompt.trim()) return;

        const updatedMessages = [
            ...messages,
            { role: "user", content: prompt }
        ];
        setMessages(updatedMessages);
        setLoading(true);

        try {
            const token = sessionStorage.getItem("authToken");

            const response = await axios.post(
                "/api/ask_ai",
                { prompt },
                {
                    headers: {
                        Authorization: token
                    }
                }
            );

            const aiReply = response.data.response || "Немає відповіді";

            setMessages([
                ...updatedMessages,
                { role: "assistant", content: aiReply }
            ]);
        } catch (error) {
            console.error("Помилка при виклику ШІ:", error);
            alert("Сталася помилка при зверненні до ШІ");
        } finally {
            setPrompt("");
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>OWL AI</h2>
            </div>

            <div className={styles.chatWindow}>
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={
                            msg.role === "user" ? styles.userMessage : styles.aiMessage
                        }
                        style={{
                            margin: "10px 0",
                            padding: "10px",
                            borderRadius: "8px",
                            background:
                                msg.role === "user"
                                    ? "rgba(255, 255, 255, 0.05)"
                                    : "rgba(255, 255, 255, 0.15)"
                        }}
                    >
                        <strong>
                            {msg.role === "user" ? "Ви:" : "AI:"}
                        </strong>{" "}
                        {msg.content}
                    </div>
                ))}
                {loading && (
                    <div
                        className={styles.aiMessage}
                        style={{
                            margin: "10px 0",
                            padding: "10px",
                            borderRadius: "8px",
                            background: "rgba(255, 255, 255, 0.15)"
                        }}
                    >
                        <strong>AI:</strong> Обробляю запит...
                    </div>
                )}
            </div>

            <div className={styles.chatInput} style={{ marginTop: "20px" }}>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Введіть ваше запитання..."
                    style={{
                        width: "100%",
                        height: "60px",
                        resize: "none",
                        borderRadius: "5px",
                        padding: "8px",
                        marginBottom: "10px"
                    }}
                />
                <button
                    onClick={handleSend}
                    disabled={loading}
                    className={styles.button}
                >
                    Надіслати
                </button>
            </div>
        </div>
    );
}

export default ArtificialIntelligenceTab;
