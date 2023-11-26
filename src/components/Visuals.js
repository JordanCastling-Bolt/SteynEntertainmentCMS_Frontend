import React, { useState, useEffect } from 'react';
import { uploadBytesResumable, getDownloadURL, ref, getStorage, listAll, deleteObject } from 'firebase/storage';
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
    const [lightboxVisible, setLightboxVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedImageId, setSelectedImageId] = useState(null);

    const categoryPaths = {
        eventsAndTouring: 'pLsA5o87UFtGtDyJfkan/eventsAndTouring',
        inTheCity: 'H5Pm9v6RcRh8EjqUna7N/inTheCity',
        rockingTheDaisies: 'vKsAOo87UEtGiDyGfvIf/rockingTheDaisies',
    };
    const openLightbox = (imageSrc, imageId) => {
        console.log("Opening lightbox for image ID:", imageId);  // Debugging log   
        setSelectedImage(imageSrc);
        setSelectedImageId(imageId);
        setLightboxVisible(true);
    };

    useEffect(() => {
        const fetchEvents = async () => {
            console.log('Current visual category ID:', visualCategory); // Debugging log

            if (!visualCategory) {
                setEvents([]);
                return;
            }

            try {
                const eventsQuery = query(collection(db, 'Events'), where('category', '==', visualCategory));
                const eventsSnapshot = await getDocs(eventsQuery);

                if (eventsSnapshot.empty) {
                    console.log('No matching documents.'); // Debugging log
                    setEvents([]);
                    return;
                }

                const eventsList = eventsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                setEvents(eventsList);
            } catch (error) {
                console.error('Error fetching events:', error);
                setFeedback(`Error fetching events: ${error.message}`);
            }
        };
        fetchEvents();
    }, [visualCategory]);


    useEffect(() => {
        const fetchVisualsFromStorage = async () => {
            if (!visualCategory) {
                setVisuals([]);
                return;
            }

            // Get the correct path from the categoryPaths mapping
            const path = `visuals/${categoryPaths[visualCategory] || ''}`;

            if (!path) {
                console.error('Invalid visual category:', visualCategory);
                setFeedback(`Invalid visual category: ${visualCategory}`);
                return;
            }
            const visualsRef = ref(storage, path);

            try {
                const listResult = await listAll(visualsRef);
                const visualsList = await Promise.all(
                    listResult.items.map(async (itemRef, index) => {
                        const url = await getDownloadURL(itemRef);
                        return {
                            id: itemRef.name, // or `index` or any other unique identifier
                            media: url
                        };
                    })
                );
                // Define visualsList here, inside the try block
                console.log("Visuals fetched:", visualsList); // Now visualsList is defined
                setVisuals(visualsList);
            } catch (error) {
                console.error('Error fetching visuals from storage:', error);
                setFeedback(`Error fetching visuals: ${error.message}`);
            }
        };

        fetchVisualsFromStorage();
    }, [visualCategory]);


    const handleAddVisual = async (e) => {
        e.preventDefault();
        if (!visualCategory.trim()) {
            setFeedback('Please select a category the visual.');
            return;
        }
        const uploadPath = `visuals/${categoryPaths[visualCategory] || ''}`;

        if (visualFiles && visualFiles.length > 0) {
            for (let i = 0; i < visualFiles.length; i++) {
                const visualFile = visualFiles[i];
                const storageRef = ref(storage, `${uploadPath}/${visualFile.name}`);
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

    const handleDeleteVisual = async () => {
        console.log("Deleting image with ID:", selectedImageId);  // Debugging log

        if (!selectedImageId) {
            setFeedback('No image selected for deletion.');
            return;
        }

        try {
            // Step 1: Delete the document from Firestore
            await deleteDoc(doc(db, 'Visuals', selectedImageId));

            // Step 2: Delete the corresponding file from Firebase Storage
            // Construct the path using categoryPaths mapping
            const storagePath = `visuals/${categoryPaths[visualCategory]}/${selectedImageId}`;
            const fileRef = ref(storage, storagePath);
            await deleteObject(fileRef);

            // Update visuals state
            const updatedVisuals = visuals.filter(visual => visual.id !== selectedImageId);
            setVisuals(updatedVisuals);

            setLightboxVisible(false);
            setSelectedImage(null);
            setSelectedImageId(null);

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

        return (
            <div className={styles["gallery-container"]}>
                {visuals.map((visual) => (
                    <div key={visual.id} className={styles["gallery-item"]}
                        onClick={() => openLightbox(visual.media, visual.id)}>
                        <img src={visual.media} alt={`Visual ${visual.id}`} />
                    </div>
                ))}
            </div>
        );
    };

    const renderLightbox = () => {
        if (!lightboxVisible) return null;

        return (
            <div className={styles["lightbox"]} onClick={() => setLightboxVisible(false)}>
                <div className={styles["lightbox-content"]}>
                    <img src={selectedImage} alt="Enlarged visual" />
                    <button className={styles["delete-button"]} onClick={handleDeleteVisual}>Delete Image</button>
                </div>
            </div>
        );
    };
    return (
        <div className={styles["visuals-container"]}>
            <div className={styles["form-column"]}>
                {renderLightbox()}
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