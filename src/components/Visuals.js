import React, { useState, useEffect } from 'react';
import { uploadBytesResumable, getDownloadURL, ref, getStorage, listAll } from 'firebase/storage';
import { db } from '../firebase';
import { storage } from '../firebase';
import { addDoc, collection, getDocs, query, orderBy, limit, startAfter, where, deleteDoc, doc } from 'firebase/firestore';
import './style/Visuals.css';

const PAGE_SIZE = 1;

const Visuals = () => {
    const [visuals, setVisuals] = useState([]);
    const [visualTitle, setVisualTitle] = useState('');
    const [visualCategory, setVisualCategory] = useState('');
    const [visualFile, setVisualFile] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [lastVisible, setLastVisible] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [events, setEvents] = useState([]);
    const filteredEvents = events.filter(event => event.category === visualCategory);

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
            if (!selectedEvent) {
                setVisuals([]);
                return;
            }

            const visualsQuery = query(
                collection(db, 'Visuals'),
                where('eventId', '==', selectedEvent.id),
                where('category', '==', visualCategory),
                orderBy('title'),
                limit(PAGE_SIZE)
            );
            const visualsSnapshot = await getDocs(visualsQuery);
            const visualsList = visualsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setVisuals(visualsList);
            if (visualsSnapshot.docs.length > 0) {
                setLastVisible(visualsSnapshot.docs[visualsSnapshot.docs.length - 1]);
            }
        };

        fetchVisuals();
    }, [selectedEvent, visualCategory]);

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

        if (visualFile) {
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
        } else {
            setFeedback('Please select a file for the visual.');
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

    const fetchMoreVisuals = async () => {
        // Stop fetching if no category or event is selected
        if (!selectedEvent || !visualCategory) return;

        const nextVisualsQuery = query(
            collection(db, 'Visuals'),
            where('eventId', '==', selectedEvent.id),
            where('category', '==', visualCategory),
            orderBy('title'),
            startAfter(lastVisible),
            limit(PAGE_SIZE)
        );

        const nextVisualsSnapshot = await getDocs(nextVisualsQuery);

        const nextVisualsList = nextVisualsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

        // If there are more visuals to fetch
        if (nextVisualsSnapshot.docs.length > 0) {
            setLastVisible(nextVisualsSnapshot.docs[nextVisualsSnapshot.docs.length - 1]);
        }

        // Concatenate the new visuals to the existing ones
        setVisuals(prevVisuals => [...prevVisuals, ...nextVisualsList]);
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

    const getVideoType = (url) => {
        if (url.endsWith('.mp4')) return "video/mp4";
        if (url.endsWith('.ogg')) return "video/ogg";
        if (url.endsWith('.webm')) return "video/webm";
        if (url.endsWith('.mkv')) return "video/x-matroska";
        return "";
    };


    return (
        <div className='visuals-container'>
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
                    <input type="file" onChange={e => setVisualFile(e.target.files[0])} />
                </label>
                <br />
                <button type="submit">Add Visual</button>
            </form>
            <ul>
                {visuals.map((visual, index) => (

                    <li key={index}>
                        
                        {visual.media && (
                            visual.media.endsWith('.mp4') ||
                            visual.media.endsWith('.ogg') ||
                            visual.media.endsWith('.webm') ||
                            visual.media.endsWith('.mkv')
                        ) ? (
                            console.log("Media URL:", visual.media),
                            console.log("MIME Type:", getVideoType(visual.media)),
                            <video width="320" height="240" controls onError={(e) => console.error('Video error', e)}>
                                <source src={visual.media} type={getVideoType(visual.media)} />
                                Your browser does not support the video tag.
                            </video>

                        ) : (
                            <img src={visual.media} alt={visual.title} />
                        )}
                        <h3>{visual.title}</h3>
                        <p>Category: {visualCategory}</p>
                        <button onClick={() => handleDeleteVisual(visual.id)}>Delete</button>
                    </li>
                ))}
            </ul>
            <button onClick={fetchMoreVisuals}>Load More</button>
        </div>
    );
}
export default Visuals;
