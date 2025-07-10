// pages/index.tsx
import React, { useState, useEffect } from 'react';
import { Shuffle, Copy, Download, Folder, RefreshCw, ExternalLink } from 'lucide-react';

// This interface must match the structure from our API
interface MegaFile {
  id: number;
  fileName: string;
  fullPath: string;
  folderPath: string;
  extension: string;
  url: string; // The URL will be the handle link for now
}

const MegaFilePicker = () => {
  const [database, setDatabase] = useState<MegaFile[]>([]);
  const [currentBatch, setCurrentBatch] = useState<MegaFile[]>([]);
  const [currentFile, setCurrentFile] = useState<MegaFile | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start in loading state
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ folders: 0, files: 0 });
  
  // This function runs once when the page loads
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        // Call our own backend API
        const response = await fetch('/api/get-files');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || 'Failed to fetch files from the server.');
        }

        const data = await response.json();
        const parsedFiles: MegaFile[] = data.files;

        if (parsedFiles.length === 0) {
          setError('No files found in your MEGA account.');
        } else {
           // We need to generate the full link. `megajs` doesn't provide it directly in the file list.
           // The API provides the handle, which is what we need.
          const filesWithFullLinks = parsedFiles.map(file => ({
            ...file,
            // The url from the API is already in the format we need
          }));

          setDatabase(filesWithFullLinks);
          const folders = new Set(filesWithFullLinks.map(f => f.folderPath)).size;
          setStats({
            files: filesWithFullLinks.length,
            folders,
          });
        }
      } catch (e: any) {
        console.error(e);
        setError(`An error occurred: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFiles();
  }, []); // The empty array [] means this effect runs only once

  // --- The rest of the functions are mostly the same as your original app ---

  const getFileType = (extension: string) => {
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'];
    const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg'];
    const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'md'];
    
    if (imageExts.includes(extension)) return 'image';
    if (videoExts.includes(extension)) return 'video';
    if (audioExts.includes(extension)) return 'audio';
    if (docExts.includes(extension)) return 'document';
    return 'file';
  };

  const getFileIcon = (type: string) => {
    switch(type) {
      case 'image': return '🖼️';
      case 'video': return '🎥';
      case 'audio': return '🎵';
      case 'document': return '📄';
      default: return '📁';
    }
  };

  const pickRandomFile = () => {
    if (database.length === 0) return;
    
    const randomFile = database[Math.floor(Math.random() * database.length)];
    setCurrentFile(randomFile);
    
    if (!currentBatch.find(f => f.id === randomFile.id)) {
      setCurrentBatch(prev => [randomFile, ...prev]);
    }
  };

  const generateBatch = (count = 10) => {
    if (database.length === 0) return;
    
    const batch: MegaFile[] = [];
    const used = new Set<number>();
    
    const limit = Math.min(count, database.length);
    while (batch.length < limit) {
      const randomFile = database[Math.floor(Math.random() * database.length)];
      if (!used.has(randomFile.id)) {
        batch.push(randomFile);
        used.add(randomFile.id);
      }
    }
    
    setCurrentBatch(batch);
    setCurrentFile(batch[0] || null);
  };
  
  const copyAllFiles = () => {
    if (currentBatch.length === 0) return;
    
    const timestamp = new Date().toLocaleString();
    const text = `Random Files - ${timestamp}\n\n` + 
      currentBatch.map((file, index) => 
        `${index + 1}. ${file.fileName}\n   Path: ${file.fullPath}\n   Link: ${file.url}\n`
      ).join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      alert('Files and links copied to clipboard!');
    });
  };

  const downloadFileList = () => {
    if (currentBatch.length === 0) return;
    
    const timestamp = new Date().toISOString().split('T')[0];
     const text = `Random Files - ${timestamp}\n\n` + 
      currentBatch.map((file, index) => 
        `${index + 1}. ${file.fileName}\n   Path: ${file.fullPath}\n   Link: ${file.url}\n`
      ).join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `random-files-${timestamp}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const clearBatch = () => {
    setCurrentBatch([]);
    setCurrentFile(null);
  };

  const openInMega = (url: string) => {
    if (!url) return;
    // We can't generate the full link with key easily this way, so we open the handle link
    // MEGA will ask for the key if the user hasn't opened it before.
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // --- UI Rendering ---

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-sans">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">MEGA File Picker</h1>
            <p className="text-gray-600 text-sm">Random file discovery from your MEGA cloud</p>
          </div>

          {isLoading ? (
            <div className="text-center p-8">
              <RefreshCw className="mx-auto h-12 w-12 text-gray-400 mb-4 animate-spin" />
              <p className="text-gray-600">Connecting to MEGA and fetching file list...</p>
              <p className="text-xs text-gray-500">(This may take a minute for large accounts)</p>
            </div>
          ) : error ? (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          ) : (
             <>
              <div className="bg-gray-50 rounded-2xl p-4 mb-6 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.files}</div>
                  <div className="text-xs text-gray-600">Files</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.folders}</div>
                  <div className="text-xs text-gray-600">Unique Folders</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{currentBatch.length}</div>
                  <div className="text-xs text-gray-600">In Batch</div>
                </div>
              </div>

              {currentFile && (
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-5 mb-6 text-white shadow-lg">
                  <div className="flex items-start mb-4">
                    <span className="text-3xl mr-4 mt-1">{getFileIcon(getFileType(currentFile.extension))}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xl break-words">{currentFile.fileName}</div>
                      <div className="text-blue-200 text-sm capitalize">{getFileType(currentFile.extension)}</div>
                    </div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-xl p-3 mb-4 text-sm flex items-start">
                    <Folder className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="break-all">{currentFile.folderPath}</span>
                  </div>
                  <button
                    onClick={() => openInMega(currentFile.url)}
                    className="w-full bg-white text-blue-600 font-semibold px-4 py-3 rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2"
                  >
                    <ExternalLink className="h-5 w-5" />
                    <span>Open in MEGA</span>
                  </button>
                </div>
              )}
              
              <div className="space-y-3 mb-6">
                 <div className="grid grid-cols-2 gap-3">
                   <button onClick={pickRandomFile} className="bg-blue-500 text-white px-4 py-3 rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2">
                     <Shuffle className="h-5 w-5" /> <span>Pick Random</span>
                   </button>
                   <button onClick={() => generateBatch(10)} className="bg-green-500 text-white px-4 py-3 rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center space-x-2">
                     <RefreshCw className="h-5 w-5" /> <span>New Batch</span>
                   </button>
                 </div>
                 
                 {currentBatch.length > 0 && (
                   <div className="grid grid-cols-3 gap-2">
                     <button onClick={copyAllFiles} className="bg-purple-500 text-white p-2 rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center space-x-1 text-sm">
                       <Copy className="h-4 w-4" /> <span>Copy List</span>
                     </button>
                     <button onClick={downloadFileList} className="bg-indigo-500 text-white p-2 rounded-lg hover:bg-indigo-600 transition-colors flex items-center justify-center space-x-1 text-sm">
                       <Download className="h-4 w-4" /> <span>Download List</span>
                     </button>
                     <button onClick={clearBatch} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center justify-center">
                       Clear Batch
                     </button>
                   </div>
                 )}
               </div>
               
               {currentBatch.length > 0 && (
                 <div className="bg-gray-50 rounded-2xl p-4">
                   <h3 className="font-semibold text-gray-700 mb-3">Current Batch ({currentBatch.length})</h3>
                   <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                     {currentBatch.map((file) => (
                       <div
                         key={file.id}
                         className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center space-x-3 ${
                           currentFile?.id === file.id ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-200 hover:border-gray-300'
                         }`}
                         onClick={() => setCurrentFile(file)}
                       >
                         <span className="text-lg">{getFileIcon(getFileType(file.extension))}</span>
                         <div className="flex-1 min-w-0">
                           <div className="font-medium text-sm truncate">{file.fileName}</div>
                           <div className="text-xs text-gray-500 truncate">{file.folderPath}</div>
                         </div>
                         <button onClick={(e) => { e.stopPropagation(); openInMega(file.url); }} className="text-gray-400 hover:text-blue-600 p-1 rounded-full">
                           <ExternalLink className="h-4 w-4" />
                         </button>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MegaFilePicker;