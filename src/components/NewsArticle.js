import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { addDoc, collection, getDocs, deleteDoc, doc, query, orderBy, limit, startAfter, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import styles from './style/NewsArticle.module.css';

const PAGE_SIZE = 5;

const NewsArticle = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [articles, setArticles] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingArticle, setEditingArticle] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [editingCategory, setEditingCategory] = useState('');
  const [feedback, setFeedback] = useState('');
  const titleRef = useRef(null);

  useEffect(() => {
    if (editingId && titleRef.current) {
      titleRef.current.focus();
    }
  }, [editingId]);

  useEffect(() => {
    const fetchArticles = async () => {
      const articlesQuery = query(collection(db, 'NewsArticles'), orderBy('timestamp', 'desc'), limit(PAGE_SIZE));
      const articlesSnapshot = await getDocs(articlesQuery);
      const articlesList = articlesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setArticles(articlesList);
      setLastVisible(articlesSnapshot.docs[articlesSnapshot.docs.length - 1]);
    };
    fetchArticles();
  }, []);

  const uploadImage = async (imageFile) => {
    if (!imageFile) return null;
    const storageRef = ref(storage, `NewsArticles/${imageFile.name}`);
    const uploadTask = uploadBytesResumable(storageRef, imageFile);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        () => { }, // Progress handling, if you want it
        (error) => {
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(storageRef);
          resolve(downloadURL);
        }
      );
    });
  };

  const initiateEdit = (article) => {
    setEditingTitle(article.title);
    setEditingContent(article.content);
    setEditingCategory(article.category);
    setEditingId(article.id);
    setEditingArticle(article);
  };

  const handleEditArticle = async () => {
    try {
      const newImageUrl = await uploadImage(image);
      const articleRef = doc(db, 'NewsArticles', editingId);
      await updateDoc(articleRef, {
        title: editingTitle,
        content: editingContent,
        category: editingCategory,
        imageUrl: newImageUrl || editingArticle.imageUrl,
      });
      setArticles(articles.map(article => article.id === editingId ? { ...article, title: editingTitle, content: editingContent, category: editingCategory, imageUrl } : article));
      setEditingId(null);
      setFeedback('Article updated successfully!');
    } catch (error) {
      setFeedback(`Error updating article: ${error.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingTitle('');
    setEditingContent('');
    setEditingCategory('');
    setEditingId(null);
    setEditingArticle(null);
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    handleEditArticle();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !content || !category || !image) {
      setFeedback('All fields are required.');
      return;
    }

    const storageRef = ref(storage, `NewsArticles/${image.name}`);
    const uploadTask = uploadBytesResumable(storageRef, image);

    // Handle upload progress
    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setFeedback(`Upload is ${progress}% done`);
      },
      (error) => {
        setFeedback(`Upload failed: ${error.message}`);
      },
      async () => {
        try {
          const newImageUrl = await uploadImage(image);
          await addDoc(collection(db, 'NewsArticles'), {
            title,
            content: DOMPurify.sanitize(content),
            category,
            imageUrl: newImageUrl,
            timestamp: serverTimestamp(),
          });
          setTitle('');
          setContent('');
          setImage(null);
          setCategory('');
          setFeedback('Article added successfully.');
        } catch (error) {
          setFeedback(`Failed to add article: ${error.message}`);
        }
      }
    );
  };

  const handleDeleteArticle = async (id) => {
    try {
      await deleteDoc(doc(db, 'NewsArticles', id));
      setArticles(articles.filter(article => article.id !== id));
      setFeedback('Article deleted successfully!');
    } catch (error) {
      setFeedback(`Error deleting article: ${error.message}`);
    }
  };

  const fetchMoreArticles = async () => {
    if (!lastVisible) return;
    const nextQuery = query(
      collection(db, 'NewsArticles'),
      orderBy('timestamp', 'desc'),
      startAfter(lastVisible),
      limit(PAGE_SIZE)
    );
    const nextSnapshot = await getDocs(nextQuery);
    const nextList = nextSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setArticles([...articles, ...nextList]);
    setLastVisible(nextSnapshot.docs[nextSnapshot.docs.length - 1]);
  };

  return (
    <div className={styles["news-article-container"]}>
      {feedback && <div>{feedback}</div>}
      <div className="left-column">
        <h3>Existing Articles</h3>
        {articles.map(article => (
          <div key={article.id}>
            <h4>{article.title}</h4>
            {article.imageUrl && <img src={article.imageUrl} alt={article.title} />}
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}></div>
            {editingId === article.id ? (
              <div>
                {/* Edit form */}
                <form onSubmit={handleUpdate}>
                  <div>
                    <input
                      ref={titleRef}
                      value={editingTitle}
                      onChange={e => setEditingTitle(e.target.value)}
                      placeholder="Article Title"
                    />
                  </div>
                  <div>
                    <ReactQuill value={editingContent} onChange={setEditingContent} />
                  </div>
                  <div>
                    <input type="file" onChange={e => setImage(e.target.files[0])} />
                  </div>
                  <div>
                    <select value={editingCategory} onChange={e => setEditingCategory(e.target.value)}>
                      <option value="">Select Category</option>
                      <option value="eventsAndTouring">Events and Touring</option>
                      <option value="rockingTheDaisies">Rocking the Daisies</option>
                      <option value="inTheCity">In the City</option>
                    </select>
                  </div>
                  <div>
                    <button type="submit">Update</button>
                    <button type="button" onClick={handleCancelEdit}>Cancel</button>
                  </div>
                </form>
              </div>
            ) : (
              <div>
                <button onClick={() => initiateEdit(article)}>Edit</button>
                <button onClick={() => handleDeleteArticle(article.id)}>Delete</button>
              </div>
            )}
          </div>
        ))}
        <button onClick={fetchMoreArticles}>Load more articles</button>
      </div>
      <div className={styles["news-article-container"]}>
        <div className="right-column">
          <h3>Add New Article</h3>
          <form onSubmit={handleSubmit}>
            <div>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Article Title" />
            </div>
            <div className='article-p'>
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
            <div>
              <button type="submit">Submit</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewsArticle;
