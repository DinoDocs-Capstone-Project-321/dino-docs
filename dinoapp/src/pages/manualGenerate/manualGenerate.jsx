import React, { useState } from 'react';
import axios from 'axios';
import './manualGenerate.css'; // Import the CSS file

function ManualGenerate() {
  const [file, setFile] = useState(null);
  const [jsonText, setJsonText] = useState('');
  const [jsonPreview, setJsonPreview] = useState('');
  const [message, setMessage] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage('Please upload a file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await axios.post('http://localhost:8000/api/manual-generate/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // Set headers for file upload
        },
      });
      // If the response is successful
      if (result.data.status === 'success') {
        setFileUrl(result.data.filename); // Assuming the response returns the filename
        setMessage(`File uploaded successfully: ${result.data.filename}`);
      } else {
        setMessage(`Upload failed: ${result.data.message}`);
      }
    } catch (error) {
      // Handle errors here
      setMessage(`Upload error: ${error.response ? error.response.data : error.message}`);
    }
  };

  const handleValidate = () => {
    try {
      JSON.parse(jsonText);
      setJsonPreview(JSON.stringify(JSON.parse(jsonText), null, 2));
      setMessage('JSON is valid.');
    } catch (error) {
      setMessage('Invalid JSON format.');
    }
  };

  return (
    <div className="manual-generate-container">
      <div className="upload-section">
        <h1>Upload File</h1>
        <form onSubmit={handleFileUpload}>
          <input
            type="file"
            onChange={handleFileChange}
            className="file-input"
          />
          <button type="submit" className="button">Upload</button>
        </form>
        {message && <p className="message">{message}</p>}
        {fileUrl && (
          <div>
            <h2>Uploaded Document</h2>
            <iframe
              src={fileUrl}
              className="iframe"
              title="Uploaded Document"
            ></iframe>
          </div>
        )}
      </div>

      <div className="json-section">
        <h2>Paste JSON Document</h2>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder="Paste your JSON here..."
          className="textarea"
        />
        <button onClick={handleValidate} className="button">Validate</button>
        {jsonPreview && (
          <pre className="json-preview">{jsonPreview}</pre>
        )}
      </div>

      <div className="button-row">
        <button className="row-button">Button 1</button>
        <button className="row-button">Button 2</button>
        <button className="row-button">Button 3</button>
      </div>
    </div>
  );
}

export default ManualGenerate;
