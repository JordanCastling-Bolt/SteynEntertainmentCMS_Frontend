import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { addDoc, collection, getDocs, deleteDoc, doc, query, orderBy, limit, startAfter, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './style/NewsArticle.css';

const PAGE_SIZE = 1;  // Arbitrary value; adjust as needed

const NewsArticle = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [ setUploadProgress] = useState(0);
  const [category, setCategory] = useState('');
  const [articles, setArticles] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [feedback, setFeedback] = useState('');

  const handleEditArticle = async (id, updatedTitle, updatedContent, updatedCategory) => {
    try {
      const articleRef = doc(db, 'NewsArticles', id);
      await updateDoc(articleRef, {
        title: updatedTitle,
        content: updatedContent,
        category: updatedCategory,
        imageUrl: imageUrl // Keeping imageUrl because if they've uploaded a new image it should update, if not, it will remain the same.
      });
      setArticles(articles.map(article => article.id === id ? { ...article, title: updatedTitle, content: updatedContent, category: updatedCategory, imageUrl } : article));
      setEditingId(null);
      setFeedback('Article updated successfully!');
    } catch (error) {
      setFeedback(`Error updating article: ${error.message}`);
    }
  };

  const handleUpdate = (e) => {
    e.preventDefault();

    if (!title.trim() || !content.trim() || !category.trim()) {
      setFeedback('Please fill out all fields.');
      return;
    }

    handleEditArticle(editingId, title, content, category);
  };

  useEffect(() => {
    const fetchArticles = async () => {
      const articlesQuery = query(collection(db, 'NewsArticles'), orderBy('timestamp', 'desc'), limit(PAGE_SIZE));
      const articlesSnapshot = await getDocs(articlesQuery);
      const articlesList = articlesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setArticles(articlesList);
      if (articlesSnapshot.docs.length > 0) {
        setLastVisible(articlesSnapshot.docs[articlesSnapshot.docs.length - 1]);
      }
    };
    fetchArticles();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Check if all required fields are filled
    if (!title.trim() || !content.trim() || !category.trim()) {
      setFeedback('Please fill out all fields.');
      return;
    }

    if (image) {
      const storageRef = ref(storage, 'NewsArticles/' + image.name);
      const uploadTask = uploadBytesResumable(storageRef, image);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          alert(`Error uploading image: ${error.message}`);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setImageUrl(downloadURL);

            // Check if we are editing or adding a new article
            if (editingId) {
              // Update the existing article
              const articleRef = doc(db, 'NewsArticles', editingId);
              await updateDoc(articleRef, {
                title: title,
                content: content,
                imageUrl: downloadURL,
                category: category,
              });
              setFeedback('Article updated successfully!');

              // Update articles in state to reflect the changes
              const updatedArticles = articles.map(article => article.id === editingId ? { id: editingId, title, content, imageUrl: downloadURL, category } : article);
              setArticles(updatedArticles);

              // Reset editing state
              setEditingId(null);

            } else {
              // Add new article to Firestore
              await addDoc(collection(db, 'NewsArticles'), {
                title: title,
                content: content,
                imageUrl: downloadURL,
                category: category,
                timestamp: new Date()
              });
              setFeedback('Article added successfully!');
            }

            // Reset form fields
            setTitle('');  
            setContent('');
            setImage(null);

          } catch (error) {
            console.error("Error saving document: ", error);
            setFeedback('Error saving article. Please try again.');
          }
        }
      );
    } else {
      alert('Please select an image for the article.');
    }
};

  
const handleDeleteArticle = async (id) => {
  try {
    await deleteDoc(doc(db, 'NewsArticles', id));
    const updatedArticles = articles.filter(article => article.id !== id);
    setArticles(updatedArticles);
    setFeedback('Article deleted successfully!');
  } catch (error) {
    setFeedback(`Error deleting article: ${error.message}`);
  }
};
  const fetchMoreArticles = async () => {
    if (!lastVisible) return;

    const next = query(collection(db, 'NewsArticles'), orderBy('timestamp', 'desc'), startAfter(lastVisible), limit(PAGE_SIZE));
    const articlesSnapshot = await getDocs(next);
    const newArticles = articlesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    setArticles(prevArticles => [...prevArticles, ...newArticles]);
    if (articlesSnapshot.docs.length > 0) {
      setLastVisible(articlesSnapshot.docs[articlesSnapshot.docs.length - 1]);
    }
  };

  const handleEdit = (article) => {
    setTitle(article.title);
    setContent(article.content);
    setCategory(article.category);
    setEditingId(article.id);
  };
  
  return (
    <div className="news-article-container">
      {feedback && <div>{feedback}</div>}
      {editingId ? (
        <div>
          <h2>Edit News Article</h2>
          <form onSubmit={handleUpdate}>
          <h2>Edit News Article</h2>
          <div>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Article Title"
            />
          </div>
          <div>
            <ReactQuill value={content} onChange={setContent} />
          </div>
          <div>
            <input type="file" onChange={e => setImage(e.target.files[0])} />
          </div>
          <div>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Select Category</option>
              <option value="eventsAndTouring">Events and Touring</option>
              <option value="rockingTheDaisies">Rocking the Daisies</option>
              <option value="inTheCity">In the City</option>
            </select>
          </div>
          <button type="submit">Update Article</button>
        </form>
        </div>
      ) : (
        <div>
      <h2>Add News Article</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Article Title"
          />
        </div>
        <div>
          <ReactQuill value={content} onChange={setContent} />
        </div>
        <div>
          <input type="file" onChange={e => setImage(e.target.files[0])} />
        </div>
        <div>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Select Category</option>
            <option value="eventsAndTouring">Events and Touring</option>
            <option value="rockingTheDaisies">Rocking the Daisies</option>
            <option value="inTheCity">In the City</option>
          </select>
        </div>
        <button type="submit">
          Add Article
        </button>
      </form>
      </div>
      )}
      <div>
      <h3>Preview</h3>
      <div>
        <h4>{title}</h4>
        {editingId ? (
          <ReactQuill value={content} readOnly={true} theme={"snow"} />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}></div>
        )}
        {imageUrl && <img src={imageUrl} alt={title} />}
      </div>
    </div>

    <div>
      <h3>Existing Articles</h3>
      {articles.map(article => (
        <div key={article.id}>
            <h4>{article.title}</h4>
            {article.imageUrl && <img src={article.imageUrl} alt={article.title} />}
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}></div>
            <button onClick={() => handleEdit(article)}>Edit</button>
            <button onClick={() => handleDeleteArticle(article.id)}>Delete</button>
          </div>
        ))}
        <button onClick={fetchMoreArticles}>Load More</button>
      </div>
    </div>
  );
};

export default NewsArticle;