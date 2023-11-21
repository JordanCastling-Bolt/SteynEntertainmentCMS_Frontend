import React, { useState, useEffect } from 'react';
import { uploadBytesResumable, getDownloadURL, ref, getStorage, listAll } from 'firebase/storage';
import { db } from '../firebase';
import { storage } from '../firebase';
import { addDoc, collection, getDocs, query, orderBy, limit, startAfter, where, deleteDoc, doc } from 'firebase/firestore';
import styles from './style/Visuals.module.css';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";


const PAGE_SIZE = 3;

const Visuals = () => {
    const [visuals, setVisuals] = useState([]);
    const [visualTitle, setVisualTitle] = useState('');
    const [visualCategory, setVisualCategory] = useState('');
    const [visualFiles, setVisualFiles] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [lastVisible, setLastVisible] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [events, setEvents] = useState([]);
    const filteredEvents = events.filter(event => event.category === visualCategory);
    const [currentVisualIndex, setCurrentVisualIndex] = useState(0);

    useEffect(() => {
        const fetchEvents = async () => {
            if (!visualCategory) {
                setEvents([]);
                return;
            }
            const eventsQuery = query(collection(db, 'Events'), where('category', '==', visualCategory));
            const eventsSnapshot = await getDocs(eventsQuery);
            const eventsList = eventsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setEvents(eventsList);
        };
        fetchEvents();
    }, [visualCategory]);

    useEffect(() => {
        const fetchVisuals = async () => {
            if (!visualCategory) {
                setVisuals([]);
                return;
            }

            const visualsQuery = query(
                collection(db, 'Visuals'),
                where('category', '==', visualCategory),
                orderBy('title'),
                limit(PAGE_SIZE)
            );

            try {
                const visualsSnapshot = await getDocs(visualsQuery);
                const visualsList = visualsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                setVisuals(visualsList);
                if (visualsSnapshot.docs.length > 0) {
                    setLastVisible(visualsSnapshot.docs[visualsSnapshot.docs.length - 1]);
                }
            } catch (error) {
                console.error('Error fetching visuals:', error);
                setFeedback(`Error fetching visuals: ${error.message}`);
            }
        };

        fetchVisuals();
    }, [visualCategory]);

    const nextVisual = () => {
        setCurrentVisualIndex(prevIndex => (prevIndex + 1) % visuals.length);
    }

    const prevVisual = () => {
        setCurrentVisualIndex(prevIndex => (prevIndex - 1 + visuals.length) % visuals.length);
    }

    const handleEventChange = (e) => {
        if (!visualCategory) {
            setFeedback('Please select a category first.');
            return;
        }
        const selectedEventId = e.target.value;
        const selectedEvent = events.find(event => event.id === selectedEventId);
        setSelectedEvent(selectedEvent);
    };

    const handleAddVisual = async (e) => {
        e.preventDefault();
        if (!visualCategory.trim() || !selectedEvent) {
            setFeedback('Please select both a category and an event for the visual.');
            return;
        }
        const title = visualTitle;
        const category = visualCategory;

        if (visualFiles && visualFiles.length > 0) {
            for (let i = 0; i < visualFiles.length; i++) {
                const visualFile = visualFiles[i];
                const storageRef = ref(storage, `visuals/${selectedEvent.id}/${category}/${visualFile.name}`);
                const uploadTask = uploadBytesResumable(storageRef, visualFile);

                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(progress);
                    },
                    (error) => {
                        setFeedback(`Error uploading visual: ${error.message}`);
                    },
                    async () => {
                        try {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            await addVisualToFirestore(downloadURL);
                            setVisualTitle('');
                            setFeedback('Visual uploaded successfully!');
                        } catch (error) {
                            setFeedback(`Error getting download URL: ${error.message}`);
                        }
                    });
            }
        } else {
            setFeedback('Please select files for the visual.');
        }
    };

    const handleDeleteVisual = async (id) => {
        try {
            await deleteDoc(doc(db, 'Visuals', id));
            const updatedVisuals = visuals.filter(visual => visual.id !== id);
            setVisuals(updatedVisuals);
            setFeedback('Visual deleted successfully!');
        } catch (error) {
            console.error('Error deleting visual:', error);
            setFeedback(`Error deleting visual: ${error.message}`);
        }
    };

    const addVisualToFirestore = async (downloadURL) => {
        try {
            await addDoc(collection(db, 'Visuals'), {
                title: visualTitle,
                media: downloadURL,
                eventId: selectedEvent.id,
                category: visualCategory,
            });
            setFeedback('Visual added successfully to Firestore!');
        } catch (error) {
            setFeedback(`Error adding visual to Firestore: ${error.message}`);
        }
    };

    const renderVisuals = () => {
        if (visuals.length === 0) {
            return <p>No visuals available.</p>;
        }

        const currentVisual = visuals[currentVisualIndex];
        if (!currentVisual || !currentVisual.media) {
            return <p>Visual data is incomplete.</p>;
        }

        return (
            <>
                <img
                    src={currentVisual.media}
                    alt={currentVisual.title || 'Visual'}
                    style={{
                        maxWidth: '200px',
                        maxHeight: '200px',
                        display: 'block',
                        marginLeft: 'auto',
                        marginRight: 'auto'
                    }}
                />
                <h3>{currentVisual.title}</h3>
                <p>Category: {currentVisual.category}</p>
                <button onClick={() => handleDeleteVisual(currentVisual.id)}>Delete</button>
                <button onClick={prevVisual}>Previous</button>
                <button onClick={nextVisual}>Next</button>
            </>
        );
    };

    return (
        <div className={styles['visuals-container']}>
            <div className={styles['form-column']}>
                {feedback && <div>{feedback}</div>}
                <form onSubmit={handleAddVisual}>
                    <label>
                        Visual Title:
                        <input
                            value={visualTitle}
                            onChange={e => setVisualTitle(e.target.value)}
                            placeholder="Visual title"
                        />
                    </label>
                    <br />
                    <label>
                        Visual Category:
                        <select value={visualCategory} onChange={e => setVisualCategory(e.target.value)}>
                            <option value="">Select Category</option>
                            <option value="eventsAndTouring">Events and Touring</option>
                            <option value="rockingTheDaisies">Rocking the Daisies</option>
                            <option value="inTheCity">In the City</option>
                        </select>
                    </label>
                    <br />
                    <label>
                        Event:

                        <select value={selectedEvent ? selectedEvent.id : ''} onChange={handleEventChange} disabled={!visualCategory}>
                            <option value="">Select Event</option>
                            {events.map(event => (
                                <option key={event.id} value={event.id}>
                                    {event.title}
                                </option>
                            ))}
                        </select>
                    </label>
                    <br />
                    <label>
                        Visual File:
                        <input type="file" onChange={e => setVisualFiles(e.target.files)} multiple />
                    </label>
                    <br />
                    <button type="submit">Add Visual</button>
                </form>
            </div>
            <div className={styles['slider-column']}>
                {renderVisuals()}
            </div>
        </div>
    );
}
export default Visuals;
