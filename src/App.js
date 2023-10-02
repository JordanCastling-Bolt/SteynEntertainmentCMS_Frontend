import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import NewsArticle from './components/NewsArticle';
import Events from './components/Events';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import Dashboard from './components/Dashboard';

function App() {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState(null);  // state to hold the user's name from Firestore
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('Dashboard');  // State to manage which section is active


  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const db = getFirestore();
        const userDocRef = doc(db, 'Users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        console.log(process.env.GOOGLEANALYTICS_CREDS);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const fullName = `${userData.firstName} ${userData.lastName}`;
          setUserName(fullName);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please sign in to access the content.</div>;
  }
  
  return (
    <div className="App">
      <aside className="sidebar">
        <div className="user-info">
          <img src={logo} alt="Logo" className="sidebar-logo" /> 
          <p>Welcome, {userName || user.email}!</p>
        </div>
        <ul>
          <li onClick={() => setActiveSection('Dashboard')}>Dashboard</li>
          <li onClick={() => setActiveSection('Articles')}>Articles</li>
          <li onClick={() => setActiveSection('Events')}>Events</li>
          <li onClick={() => setActiveSection('Visuals')}>Visuals</li>
        </ul>
      </aside>
      <main className="main-content">
        {activeSection === 'Dashboard' && <Dashboard />}
        {activeSection === 'Articles' && (
          <section className="articles">
            <h2>Latest Articles</h2>
            <NewsArticle />
          </section>
        )}
        {activeSection === 'Events' && (
          <section className="events">
            <h2>Upcoming Events</h2>
            <Events />
          </section>
        )}
        {activeSection === 'Visuals' && (
          <section className="visuals">
            <h2>Visuals</h2>
            
            {/* You can render a Visuals component here if you have one */}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;