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

function App() {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [allUsers, setAllUsers] = useState([]);  // New state to hold all users
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term

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

  const fetchFilteredUsers = async (searchTerm) => {
    const db = getFirestore();
    const usersCollection = collection(db, 'Users');
    const userQuery = query(usersCollection, where('email', '==', searchTerm));
    const userSnapshot = await getDocs(userQuery);
    const usersList = userSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    setAllUsers(usersList);
  };

  useEffect(() => {
    if (searchTerm) {
      fetchFilteredUsers(searchTerm);
    }
  }, [searchTerm]);

  const auth = getAuth();
  const handleLogout = () => {
    signOut(auth).then(() => {
      setUser(null);
      navigate('/login')
    });
  };

  const updateRole = async (uid, newRole) => {  // Function to update user role in Firestore
    const db = getFirestore();
    const userRef = doc(db, 'Users', uid);
    await updateDoc(userRef, {
      role: newRole
    });
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

  const filteredUsers = allUsers.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      <aside className="sidebar">
        <div className="user-info">
          <div className="user-info-details">
            <img src={logo} alt="Logo" className="sidebar-logo" />
            <div>
              <p className="user-info-welcome">Welcome,</p>
              <h4 className="user-info-name">{userName || user.email}</h4>
            </div>
          </div>
          {user && (
            <div className="user-info-logout">
              <button onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>

        <ul>
          <li onClick={() => setActiveSection('Dashboard')}>Dashboard</li>
          <li onClick={() => setActiveSection('Articles')}>Articles</li>
          <li onClick={() => setActiveSection('Events')}>Events</li>
          <li onClick={() => setActiveSection('Visuals')}>Visuals</li>
          <li onClick={() => setActiveSection('ManageRoles')}>Manage Roles</li>

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
        {activeSection === 'ManageRoles' && (  // New section for role management
          <section className="manage-roles">
            <h2>Manage Roles</h2>
            <input
              type="text"
              placeholder="Search by email"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} // Updating the search term
            />
            <ul>
              {filteredUsers.map(u => (
                <li key={u.id}>
                  {u.email} - {u.role}
                  <button onClick={() => updateRole(u.id, 'admin')}>Make Admin</button>
                  <button onClick={() => updateRole(u.id, 'user')}>Make User</button>
                  <button onClick={() => updateRole(u.id, 'member')}>Make Member</button> {/* New button */}
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