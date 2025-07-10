// pages/api/get-files.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Storage } from 'megajs';

// This interface remains the same
export interface ApiMegaFile {
  id: number;
  fileName: string;
  fullPath: string;
  folderPath: string;
  extension: string;
  url: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!process.env.MEGA_EMAIL || !process.env.MEGA_PASSWORD) {
    return res.status(500).json({ error: 'MEGA credentials are not configured on the server.' });
  }

  try {
    const storage = new Storage({
      email: process.env.MEGA_EMAIL,
      password: process.env.MEGA_PASSWORD,
    });

    await storage.ready;

    const files: ApiMegaFile[] = [];
    let fileIdCounter = 0;

    // --- NEW, SIMPLER LOGIC ---
    // Iterate over the flat list of files provided by megajs
    for (const fileNode of storage.files.values()) {
      // We only care about actual files, not directories
      if (fileNode.directory) {
        continue;
      }

      // The fileNode object has all the properties we need!
      const fileName = fileNode.name || 'unknown-file';
      
      // Reconstruct the full path from the `path` array
      const fullPath = fileNode.path.length > 0 
        ? `/${fileNode.path.join('/')}/${fileName}`
        : `/${fileName}`;

      const folderPath = fileNode.path.length > 0
        ? `/${fileNode.path.join('/')}`
        : '/';
        
      const extension = fileName.split('.').pop()?.toLowerCase() || '';

      files.push({
        id: fileIdCounter++,
        fileName,
        fullPath,
        folderPath,
        extension,
        // The .handle property is correct on these fileNode objects
        url: `https://mega.nz/file/${fileNode.handle}`,
      });
    }

    res.status(200).json({ files });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('MEGA API Error:', error);
    res.status(500).json({ error: 'Failed to connect to MEGA or fetch files.', details: errorMessage });
  }
}