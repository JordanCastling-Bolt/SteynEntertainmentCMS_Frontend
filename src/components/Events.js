import React, { useState, useEffect } from 'react';
import { addDoc, collection, getDocs, deleteDoc, doc, updateDoc, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase'; // Note the change to import both db and storage
import './style/Events.css';


const PAGE_SIZE = 1;

const Events = () => {
  const [events, setEvents] = useState([]);
  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [feedback, setFeedback] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [lastVisible, setLastVisible] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [eventImage, setEventImage] = useState(null);
  const [ setUploadProgress] = useState(0);
  const [eventCategory, setEventCategory] = useState(''); // State for category selection


  useEffect(() => {
    const fetchEvents = async () => {
      const eventsQuery = query(collection(db, 'Events'), orderBy('name'), limit(PAGE_SIZE));
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
              name: eventName,
              description: eventDescription,
              imageUrl: downloadURL,
              category: eventCategory
            });
            setEvents([...events, { name: eventName, description: eventDescription, imageUrl: downloadURL }]);
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
      console.log('Filtered events:', updatedEvents);
      setEvents(updatedEvents);
      setFeedback('Event deleted successfully!');
    } catch (error) {
      console.log('Error encountered:', error);
      setFeedback(`Error deleting event: ${error.message}`);
    }
  };

  const handleUpdateEvent = async (id, updatedName, updatedDescription) => {
    try {
      const eventRef = doc(db, 'Events', id);
      await updateDoc(eventRef, {
        name: updatedName,
        description: updatedDescription
      });
      setEvents(events.map(event => event.id === id ? { ...event, name: updatedName, description: updatedDescription } : event));
      setEditingId(null);
      setFeedback('Event updated successfully!');
    } catch (error) {
      setFeedback(`Error updating event: ${error.message}`);
    }
  };

  const fetchMoreEvents = async () => {
    if (!lastVisible) return;  // Make sure lastVisible is available

    const next = query(collection(db, 'Events'), orderBy('name'), startAfter(lastVisible), limit(PAGE_SIZE));
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
        <button type="submit">Add Event</button>
      </form>

      <ul>
        {events.map(event => (
          <li key={event.id}>
            {event.imageUrl && <img src={event.imageUrl} alt={event.name} />}
            {editingId === event.id ? (
              <div>
                <label>
                  Name:
                  <input
                    defaultValue={event.name}
                    onChange={e => setEditName(e.target.value)}
                  />
                </label>
                <br />
                <label>
                  Description:
                  <textarea
                    defaultValue={event.description}
                    onChange={e => setEditDescription(e.target.value)}
                  />
                </label>
                <br />
                <button onClick={() => handleUpdateEvent(event.id, editName, editDescription)}>
                  Save
                </button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            ) : (
              <div>
                <h3>{event.name}</h3>
                <p>{event.description}</p>
                <button onClick={() => { setEditName(event.name); setEditDescription(event.description); setEditingId(event.id); }}>
                  Edit
                </button>
                <button onClick={() => handleDeleteEvent(event.id)}>Delete</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <button onClick={fetchMoreEvents}>Load More</button>
    </div>
  );
};

export default Events;