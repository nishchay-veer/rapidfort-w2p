import React, { useState, useCallback } from "react";
import { FaFileWord } from "react-icons/fa6";
import axios from "axios";

function Home() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [password, setPassword] = useState("");
  const [downloadLink, setDownloadLink] = useState("");

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setMessage({ 
          type: "error", 
          text: "Please upload a valid Word document (.doc or .docx)" 
        });
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setMessage({ 
          type: "error", 
          text: "File size exceeds 10MB limit" 
        });
        return;
      }

      setSelectedFile(file);
      setMessage({ type: "", text: "" });
      setDownloadLink("");
    }
  }, []);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    
    if (!selectedFile) {
      setMessage({ type: "error", text: "Please select a file" });
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    
    if (password.trim()) {
      formData.append("password", password);
    }

    try {
      setIsLoading(true);
      setMessage({ type: "", text: "" });
      setDownloadLink("");

      // Log the request details
      console.log('Preparing to send file:', {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size
      });

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload Progress: ${percentCompleted}%`);
        },
      };

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/convert`,
        formData,
        config
      );

      console.log('Server response:', response.data);

      if (response.data.storageUrl) {
        setDownloadLink(response.data.storageUrl);
        setMessage({ type: "success", text: "File Converted Successfully!" });
      } else {
        throw new Error('No storage URL in response');
      }
    } catch (error) {
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      let errorMessage = "An unexpected error occurred. Please try again.";
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          errorMessage = error.response.data?.error || `Server error (${error.response.status})`;
        } else if (error.request) {
          errorMessage = "No response from server. Please check your connection.";
        }
      }
      
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, password]);

  return (
    <div className="max-w-screen-2xl mx-auto container px-6 py-3 md:px-40">
      <div className="flex h-screen items-center justify-center">
        <div className="border-2 border-dashed px-4 py-2 md:px-8 md:py-6 border-indigo-400 rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold text-center mb-4">
            Convert Word to PDF Online
          </h1>
          <p className="text-sm text-center mb-5">
            Easily convert Word documents to PDF format online
          </p>

          <div className="flex flex-col items-center space-y-4">
            <input
              type="file"
              accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              className="hidden"
              id="FileInput"
            />
            <label
              htmlFor="FileInput"
              className="w-full flex items-center justify-center px-4 py-6 bg-gray-100 text-gray-700 rounded-lg shadow-lg cursor-pointer border-blue-300 hover:bg-blue-700 duration-300 hover:text-white"
            >
              <FaFileWord className="text-3xl mr-3" />
              <span className="text-2xl mr-2">
                {selectedFile ? selectedFile.name : "Choose File"}
              </span>
            </label>

            <input
              type="password"
              placeholder="Optional: Document Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />

            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedFile}
                  className="text-white bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 disabled:pointer-events-none duration-300 font-bold px-4 py-2 rounded-lg"
                >
                  Convert File
                </button>
                
                {downloadLink && (
                  <button
                    onClick={() => window.open(downloadLink, '_blank')}
                    className="text-white bg-green-500 hover:bg-green-700 duration-300 font-bold px-4 py-2 rounded-lg"
                  >
                    Download PDF
                  </button>
                )}
              </>
            )}

            {message.text && (
              <div
                className={`text-center ${message.type === "success" ? "text-green-500" : "text-red-500"}`}
              >
                {message.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;