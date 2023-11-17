import React, { useState, useEffect } from 'react';
import { addDoc, collection, getDocs, deleteDoc, doc, updateDoc, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import styles from './style/Events.module.css';

const PAGE_SIZE = 3;

const Events = () => {
  const [events, setEvents] = useState([]);
  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventUrl, setEventUrl] = useState('');
  const [eventTicketUrl, setEventTicketUrl] = useState('');
  const [eventImage, setEventImage] = useState(null);
  const [eventCategory, setEventCategory] = useState('');
  const [feedback, setFeedback] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editTicketUrl, setEditTicketUrl] = useState('');
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
    const ticketUrl = eventTicketUrl;
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
              ticketUrl,
              category,
              picture: downloadURL
            });
            setEvents([...events, { title, description, date, url, ticketUrl, picture: downloadURL, category }]);
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
    const updatedTicketURL = editTicketUrl;

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
        ticketUrl: updatedTicketURL,
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
    <div className= {styles['events-container']}>
      <div style={{ display: 'flex', flexDirection: 'row' }}>

        {/* Left Column for Existing Events */}
        <div style={{ flex: 1 }}>
          {feedback && <div>{feedback}</div>}
          <ul>
            {events.map((event, index) => (
              <li key={index}>
                {event.picture && <img src={event.picture} alt={event.title} />}
                {editingId === event.id ? (
                  <div className='events-p'>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} />
                    <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)}></textarea>
                    <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                    <input type="url" value={editUrl} onChange={e => setEditUrl(e.target.value)} />
                    <input type="ticketUrl" value={editTicketUrl} onChange={e => setEditTicketUrl(e.target.value)} />
                    <select value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                      <option value="">Select Category</option>
                      <option value="eventsAndTouring">Events and Touring</option>
                      <option value="rockingTheDaisies">Rocking the Daisies</option>
                      <option value="inTheCity">In the City</option>
                    </select>
                    <button onClick={() => handleUpdateEvent(event.id)}>Save</button>
                    <button onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                ) : (
                  <div>
                    <h3>{event.title}</h3>
                    <p>{event.description}</p>
                    <p>Date: {event.date}</p>
                    <p>URL: {event.url}</p>
                    <p>Ticket URL: {event.ticketUrl}</p>
                    <p>Category: {event.category}</p>
                    <button onClick={() => {
                      setEditName(event.title);
                      setEditDescription(event.description);
                      setEditDate(event.date);
                      setEditUrl(event.url);
                      setEditTicketUrl(event.ticketUrl)
                      setEditCategory(event.category);
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

        {/* Right Column for Adding New Event */}
        <div style={{ flex: 1 }}>
          <form onSubmit={handleAddEvent}>
            <input type="text" placeholder="Event Name" value={eventName} onChange={e => setEventName(e.target.value)} />
            <textarea placeholder="Description" value={eventDescription} onChange={e => setEventDescription(e.target.value)}></textarea>
            <input type="date" placeholder="Date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
            <input type="url" placeholder="URL" value={eventUrl} onChange={e => setEventUrl(e.target.value)} />
            <input type="url" placeholder="Ticket URL" value={eventTicketUrl} onChange={e => setEventTicketUrl(e.target.value)} />
            <input type="file" onChange={e => setEventImage(e.target.files[0])} />
            <select placeholder="Category" value={eventCategory} onChange={e => setEventCategory(e.target.value)}>
              <option value="">Select Category</option>
              <option value="eventsAndTouring">Events and Touring</option>
              <option value="rockingTheDaisies">Rocking the Daisies</option>
              <option value="inTheCity">In the City</option>
            </select>
            <button type="submit">Add Event</button>
          </form>
        </div>
      </div>
    </div>
  );

}
export default Events;