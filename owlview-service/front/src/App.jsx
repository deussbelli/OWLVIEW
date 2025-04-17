import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Registration from "./pages/Registration";
import Login from "./pages/Login";
import SurveyEditor from "./pages/SurveyEditor";
import Surveys from "./pages/Surveys";
import Users from "./pages/Users";
import Tariffs from "./pages/Tariffs";
import PersonalCabinet from "./pages/PersonalCabinet";
import Balance from "./pages/Balance";
import Support from "./pages/Support";
import VerificationPage from "./pages/VerificationPage";
import SurveyPreview from "./pages/SurveyPreview";
import SurveyPass from "./pages/SurveyPass";
import Notifications from "./pages/Notifications";
import News from "./pages/News";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AdminUserSurveys from "./pages/AdminUserSurveys";
import AdminSurveyPreview from "./pages/AdminSurveyPreview";
import AdminLogs from "./pages/AdminLogs";
import styles from './styles/App.module.css';
import ServerDown from "./pages/ServerDown";
import axios from "axios";

const PrivateRoute = ({ user, children }) => {
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      alert("Потрібна авторизація для доступу до цієї сторінки.");
    }
  }, [user, location.pathname]);

  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ user, children }) => {
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      alert("Потрібна авторизація для доступу до цієї сторінки.");
      } else if (user.role !== "admin") {
      alert("Доступ заборонено. Тільки для адміністратора.");
      }
  }, [user, location.pathname]);
  return user && user.role === "admin" ? children : <Navigate to="/" />;
};

const App = () => {
  const [user, setUser] = useState(() => {
    const storedUser = sessionStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [serverError, setServerError] = useState(false);

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await axios.get('/health-check');
        if (response.status !== 200) {
          setServerError(true);
        } else {
          setServerError(false);
        }
      } catch (error) {
        console.error("Server health-check failed:", error);
        setServerError(true);
      }
    };
  
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 3000); 
  
    return () => clearInterval(interval);
  }, []);
  

  useEffect(() => {
    if (user) {
      sessionStorage.setItem("user", JSON.stringify(user));
      sessionStorage.setItem("authToken", user.token);
    } else {
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("authToken");
    }
  }, [user]);

  const handleLogout = () => {
    setUser(null);
  };

  if (serverError) {
    return <ServerDown />;
  }

  return (
    <Router>
      <div className={styles.appContainer}>
        <Header user={user} onLogout={handleLogout} />
        <main className={styles.mainContent}>
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/registration" element={<Registration onRegisterSuccess={(newUser) => setUser(newUser)} />} />
            <Route path="/login" element={<Login onLoginSuccess={(newUser) => setUser(newUser)} />} />
            <Route path="/users" element={<PrivateRoute user={user}><Users user={user} /></PrivateRoute>} />
            <Route path="/surveys" element={<PrivateRoute user={user}> <Surveys user={user} /> </PrivateRoute>} />
            <Route path="/tariffs" element={<PrivateRoute user={user}><Tariffs user={user} /></PrivateRoute>} />
            <Route path="/balance" element={<PrivateRoute user={user}><Balance user={user} /></PrivateRoute>} />
            <Route path="/support" element={<PrivateRoute user={user}><Support user={user} /></PrivateRoute>} />
            <Route path="/verification" element={<PrivateRoute user={user}><VerificationPage user={user} /></PrivateRoute>} />
            <Route path="/personal_cabinet" element={<PrivateRoute user={user}><PersonalCabinet user={user} /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
            <Route path="/survey-editor" element={<PrivateRoute user={user}><SurveyEditor user={user} /></PrivateRoute>} />
            <Route path="/survey-editor/:surveyId" element={<PrivateRoute user={user}><SurveyEditor user={user} /></PrivateRoute>} />
            <Route path="/survey-preview/:surveyId" element={<PrivateRoute user={user}><SurveyPreview user={user} /></PrivateRoute>} />
            <Route path="/survey-pass/:surveyId" element={<PrivateRoute user={user}><SurveyPass user={user} /></PrivateRoute>} />
            <Route path="/notifications" element={<PrivateRoute user={user}><Notifications user={user}/></PrivateRoute>}/>
            <Route path="/news" element={<PrivateRoute user={user}><News user={user}/></PrivateRoute>}/>
            <Route path="/admin-user-surveys" element={<AdminRoute user={user}><AdminUserSurveys user={user} /></AdminRoute> }/>
            <Route path="/admin-user-surveys/preview/:surveyId" element={<AdminRoute user={user}><AdminSurveyPreview user={user} /></AdminRoute>}/>
            <Route path="/logs" element={<AdminRoute user={user}><AdminLogs user={user} /></AdminRoute> }/></Routes> </main>
        <Footer user={user} />
      </div>
    </Router>
  );
};

export default App;