import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import NewsArticle from './components/NewsArticle';
import Events from './components/Events';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc, query, where } from 'firebase/firestore';
import Dashboard from './components/Dashboard';
import Visuals from './components/Visuals';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaNewspaper, FaCalendarAlt, FaImages, FaUserCog } from 'react-icons/fa'; // Alternative icons


function App() {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [allUsers, setAllUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userDocRef = doc(db, 'Users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

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

  const filteredUsers = allUsers.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    // Fetch all users initially
    const fetchAllUsers = async () => {
      const db = getFirestore();
      const usersCollection = collection(db, 'Users');
      const userSnapshot = await getDocs(usersCollection);
      const usersList = userSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setAllUsers(usersList);
    };

    fetchAllUsers();
  }, []);

  const auth = getAuth();
  const handleLogout = () => {
    signOut(auth).then(() => {
      setUser(null);
      navigate('/login')
    });
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const updateRole = async (uid, newRole) => {
    const db = getFirestore();
    const userRef = doc(db, 'Users', uid);

    try {
      await updateDoc(userRef, {
        role: newRole
      });

      // Update the allUsers state to reflect the role change
      setAllUsers(prevUsers => prevUsers.map(user => {
        if (user.id === uid) {
          return { ...user, role: newRole };
        }
        return user;
      }));

    } catch (error) {
      console.error("Error updating role:", error);
      // Optionally, handle the error (e.g., show a notification)
    }
  };

  const navigate = useNavigate();

  if (!user) {
    return (
      <div>
        Please sign in to access the content.
        <button onClick={() => navigate('/login')}>Login</button>
      </div>
    );
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      <aside className={`sidebar ${isSidebarOpen ? '' : 'collapsed'}`}>
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          <span className={isSidebarOpen ? 'toggle-icon open' : 'toggle-icon'}></span>
        </button>
        <div className="user-info">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          {isSidebarOpen && (
            <div>
              <p className="user-info-welcome">Welcome,</p>
              <h4 className="user-info-name">{userName || user.email}</h4>
            </div>
          )}
          {user && isSidebarOpen && (
            <div className="user-info-logout">
              <button onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
        <ul>
          <li className="sidebar-item" onClick={() => setActiveSection('Dashboard')}>
            <FaHome />
            {isSidebarOpen && <span>Dashboard</span>}
            {!isSidebarOpen && <span className="tooltip">Dashboard</span>}
          </li>
          {/* Articles */}
          <li className="sidebar-item" onClick={() => setActiveSection('Articles')}>
            <FaNewspaper />
            {isSidebarOpen && <span>Articles</span>}
            {!isSidebarOpen && <span className="tooltip">Articles</span>}
          </li>

          {/* Events */}
          <li className="sidebar-item" onClick={() => setActiveSection('Events')}>
            <FaCalendarAlt />
            {isSidebarOpen && <span>Events</span>}
            {!isSidebarOpen && <span className="tooltip">Events</span>}
          </li>

          {/* Visuals */}
          <li className="sidebar-item" onClick={() => setActiveSection('Visuals')}>
            <FaImages />
            {isSidebarOpen && <span>Visuals</span>}
            {!isSidebarOpen && <span className="tooltip">Visuals</span>}
          </li>

          {/* Manage Roles */}
          <li className="sidebar-item" onClick={() => setActiveSection('ManageRoles')}>
            <FaUserCog />
            {isSidebarOpen && <span>Manage Roles</span>}
            {!isSidebarOpen && <span className="tooltip">Manage Roles</span>}
          </li>
        </ul>
      </aside>
      <main className="main-content">
        {activeSection === 'Dashboard' && <Dashboard />}
        {activeSection === 'Articles' && (
          <section className="articles">
            <h2>Articles</h2>
            <NewsArticle />
          </section>
        )}
        {activeSection === 'Events' && (
          <section className="events">
            <h2>Events</h2>
            <Events />
          </section>
        )}
        {activeSection === 'Visuals' && (
          <section className="visuals">
            <h2>Visuals</h2>
            <Visuals />
          </section>
        )}
        {activeSection === 'ManageRoles' && (
          <section className="manage-roles">
            <h2>Manage Roles</h2>
            <input
              type="text"
              placeholder="Search by email"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <ul>
              {filteredUsers.map(u => (
                <li key={u.id}>
                  {u.email} - {u.role}
                  <button onClick={() => updateRole(u.id, 'admin')}>Make Admin</button>
                  <button onClick={() => updateRole(u.id, 'user')}>Make User</button>
                  <button onClick={() => updateRole(u.id, 'member')}>Make Member</button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;