import React, { useState, useEffect } from 'react';
import { addDoc, collection, getDocs, deleteDoc, doc, updateDoc, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import './style/Events.css';

const PAGE_SIZE = 1;

const Events = () => {
  const [events, setEvents] = useState([]);
  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventUrl, setEventUrl] = useState('');
  const [eventImage, setEventImage] = useState(null);
  const [eventCategory, setEventCategory] = useState('');
  const [feedback, setFeedback] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [lastVisible, setLastVisible] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      const eventsQuery = query(collection(db, 'Events'), orderBy('title'), limit(PAGE_SIZE));
      const eventsSnapshot = await getDocs(eventsQuery);
      const eventsList = eventsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setEvents(eventsList);
      if (eventsSnapshot.docs.length > 0) {
        setLastVisible(eventsSnapshot.docs[eventsSnapshot.docs.length - 1]);
      }
    };
    fetchEvents();
  }, []);


  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!eventCategory.trim()) {
      setFeedback('Please select a category for the event.');
      return;
    }
    const title = eventName;
    const description = eventDescription;
    const date = eventDate;
    const url = eventUrl;
    const category = eventCategory;

    if (eventImage) {
      const storageRef = ref(storage, 'events/' + eventImage.name);
      const uploadTask = uploadBytesResumable(storageRef, eventImage);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          setFeedback(`Error uploading image: ${error.message}`);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          try {
            await addDoc(collection(db, 'Events'), {
              title,
              description,
              date,
              url,
              category,
              picture: downloadURL
            });
            setEvents([...events, { title, description, date, url, picture: downloadURL, category }]);
            setEventName('');
            setEventDescription('');
            setFeedback('Event added successfully!');
          } catch (error) {
            setFeedback(`Error adding event: ${error.message}`);
          }
        }
      );
    } else {
      // Handle adding event without image here if you want
      setFeedback('Please select an image for the event.');
    }
  };

  const handleDeleteEvent = async (id) => {
    console.log('Attempting to delete event with id:', id);
    try {
      await deleteDoc(doc(db, 'Events', id));
      console.log('Event deleted from Firestore');
      const updatedEvents = events.filter(event => event.id !== id);
      setEvents(updatedEvents);
      setFeedback('Event deleted successfully!');
    } catch (error) {
      console.log('Error encountered:', error);
      setFeedback(`Error deleting event: ${error.message}`);
    }
  };

  const [editImage, setEditImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpdateEvent = async (id) => {

    const updatedName = editName;
    const updatedDescription = editDescription;
    const updatedCategory = editCategory;
    const updatedDate = editDate;
    const updatedUrl = editUrl;

    try {
      const eventRef = doc(db, 'Events', id);

      let downloadURL = '';
      if (editImage) {
        const storageRef = ref(storage, 'events/' + editImage.name);
        const uploadTask = uploadBytesResumable(storageRef, editImage);

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => reject(error),
            async () => {
              downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });
      }

      const updatedData = {
        title: updatedName,
        description: updatedDescription,
        date: updatedDate,
        url: updatedUrl,
        category: updatedCategory
      };

      if (downloadURL) {
        updatedData.picture = downloadURL;
      }
      await updateDoc(eventRef, updatedData);

      setEvents(events.map(event =>
        event.id === id ? { ...event, ...updatedData } : event)
      );

      setEditingId(null);
      setFeedback('Event updated successfully!');
    } catch (error) {
      setFeedback(`Error updating event: ${error.message}`);
    }
  };


  const fetchMoreEvents = async () => {
    if (!lastVisible) return;

    const next = query(collection(db, 'Events'), orderBy('title'), startAfter(lastVisible), limit(PAGE_SIZE));
    const eventsSnapshot = await getDocs(next);
    const newEvents = eventsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    setEvents(prevEvents => [...prevEvents, ...newEvents]);
    if (eventsSnapshot.docs.length > 0) {
      setLastVisible(eventsSnapshot.docs[eventsSnapshot.docs.length - 1]);
    }
  };

  return (
    <div className='events-container'>
      {feedback && <div>{feedback}</div>}
      <form onSubmit={handleAddEvent}>
        <label>
          Event Name:
          <input
            value={eventName}
            onChange={e => setEventName(e.target.value)}
            placeholder="Event name"
          />
        </label>
        <br />
        <label>
          Event Description:
          <textarea
            value={eventDescription}
            onChange={e => setEventDescription(e.target.value)}
            placeholder="Event description"
          />
        </label>
        <br />
        <label>
          Event Image:
          <input type="file" onChange={e => setEventImage(e.target.files[0])} />
        </label>
        <br />
        <label>
          <select value={eventCategory} onChange={e => setEventCategory(e.target.value)}>
            <option value="">Select Category</option>
            <option value="eventsAndTouring">Events and Touring</option>
            <option value="rockingTheDaisies">Rocking the Daisies</option>
            <option value="inTheCity">In the City</option>
          </select>
        </label>
        <br />
        <label>
          Date:
          <input
            type="date" 
            onChange={e => setEventDate(e.target.value)}
          />
        </label>
        <br />
        <label>
          Event URL:
          <input
            value={eventUrl}
            onChange={e => setEventUrl(e.target.value)}
            placeholder="Event URL"
          />
        </label>
        <br />
        <button type="submit">Add Event</button>
      </form>
      <ul>
        {events.map(event => (
          <li key={event.id}>
            {event.picture && <img src={event.picture} alt={event.title} />}
            {editingId === event.id ? (
              <div>
                <label>
                  Event Name:
                  <input
                    defaultValue={event.title}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Event name"
                  />
                </label>
                <br />
                <label>
                  Event Description:
                  <textarea
                    defaultValue={event.description}
                    onChange={e => setEditDescription(e.target.value)}
                    placeholder="Event description"
                  />
                </label>
                <br />
                <label>
                  Event Image:
                  <input type="file" onChange={e => setEditImage(e.target.files[0])} />
                </label>
                <br />
                <label>
                  Date:
                  <input
                    type="date"  // Making it a date picker
                    defaultValue={event.date}
                    onChange={e => setEditDate(e.target.value)}
                  />
                </label>
                <br />
                <label>
                  URL:
                  <input
                    defaultValue={event.url}
                    onChange={e => setEditUrl(e.target.value)}
                  />
                </label>
                <br />
                <label>
                  Category:
                  <select
                    defaultValue={event.category}
                    onChange={e => setEditCategory(e.target.value)}
                  >
                    <option value="">Select Category</option>
                    <option value="eventsAndTouring">Events and Touring</option>
                    <option value="rockingTheDaisies">Rocking the Daisies</option>
                    <option value="inTheCity">In the City</option>
                  </select>
                </label>
                <br />
                <button onClick={() => handleUpdateEvent(event.id)}>Save</button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            ) : (
              <div>
                <h3>{event.title}</h3>
                <p>{event.description}</p>
                <p>Date: {event.date}</p>
                <p>URL: {event.url}</p>
                <p>Category: {event.category}</p>
                <button onClick={() => {
                  setEditName(event.title);
                  setEditDescription(event.description);
                  setEditDate(event.date); // Initialize editing date
                  setEditUrl(event.url); // Initialize editing URL
                  setEditCategory(event.category); // Initialize editing category
                  setEditingId(event.id);
                }}>Edit</button>
                <button onClick={() => handleDeleteEvent(event.id)}>Delete</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <button onClick={fetchMoreEvents}>Load More</button>
    </div>
  );
}
export default Events;