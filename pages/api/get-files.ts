// pages/api/get-files.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Storage } from 'megajs';

// Define the structure of the file data we will send back
export interface ApiMegaFile {
  id: number;
  fileName: string;
  fullPath: string;
  folderPath: string;
  extension: string;
  url: string;
}

// This is the main function for our API endpoint
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check if the credentials are set in the environment variables
  if (!process.env.MEGA_EMAIL || !process.env.MEGA_PASSWORD) {
    return res.status(500).json({ error: 'MEGA credentials are not configured on the server.' });
  }

  try {
    // Connect to MEGA using the secure environment variables
    const storage = new Storage({
      email: process.env.MEGA_EMAIL,
      password: process.env.MEGA_PASSWORD,
    });

    // Wait for the connection to be ready
    await storage.ready;

    const files: ApiMegaFile[] = [];
    let fileIdCounter = 0;

    // Helper function to recursively find all files
    function findFiles(node: any, currentPath = '') {
      if (node.directory) {
        // If it's a folder, go through its children
        for (const child of node.children) {
          findFiles(child, `${currentPath}/${node.name || ''}`);
        }
      } else {
        // If it's a file, extract its info
        const fullPath = `${currentPath}/${node.name}`.replace('//', '/'); // Clean up path
        const pathSegments = fullPath.split('/').filter(Boolean);
        const fileName = node.name;
        const folderPath = pathSegments.length > 1 ? '/' + pathSegments.slice(0, -1).join('/') : '/';
        const extension = fileName.split('.').pop()?.toLowerCase() || '';
        
        // Push the file object to our array
        files.push({
          id: fileIdCounter++,
          fileName: fileName,
          fullPath: fullPath,
          folderPath: folderPath,
          extension: extension,
          // We can generate the link here, but megajs has a better way
          // For now, we'll create the link on the frontend from the handle
          url: `https://mega.nz/file/${node.handle}`, // This will be the handle-based URL
        });
      }
    }
    
    // Start finding files from the root of your cloud drive
    findFiles(storage.root);

    // Send the list of files back to the frontend as a successful response
    res.status(200).json({ files });

  } catch (error: any) {
    console.error('MEGA API Error:', error);
    res.status(500).json({ error: 'Failed to connect to MEGA or fetch files.', details: error.message });
  }
}