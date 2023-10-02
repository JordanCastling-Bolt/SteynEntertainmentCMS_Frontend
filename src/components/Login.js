import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getFirestore, getDoc } from 'firebase/firestore'; // Firestore imports
import { useNavigate } from 'react-router-dom';
import './style/Login.css';
import logo from '../logo.svg';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const auth = getAuth();
        const db = getFirestore();
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const userId = userCredential.user.uid;

            // Fetch the user's role from the Users collection
            const userDocRef = doc(db, 'Users', userId);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();

                // Check if the user role is admin
                if (userData.role === 'admin') {
                    navigate('/app');
                } else {
                    setError('You are not authorized to access this site.');
                }
            } else {
                setError('User data not found.');
            }
        } catch (e) {
            setError(e.message);
        }
    };

    return (
        <div className="Login-body">
            <header className="App-header">
                <img src={logo} className="App-logo" alt="logo" />
            </header>

            <div className="login-body">

                <form className="login-form" onSubmit={handleSubmit}>
                    <input
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Email"
                        type="email"
                    />
                    <input
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Password"
                        type="password"
                    />
                    {error && <p>{error}</p>}
                    <button type="submit">Login</button>
                </form>
            </div>
        </div>
    );
};

export default Login;
