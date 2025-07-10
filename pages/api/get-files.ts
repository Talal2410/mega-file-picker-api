// pages/api/get-files.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Storage } from 'megajs';

export interface ApiMegaFile {
  id: number;
  fileName: string;
  fullPath: string;
  folderPath: string;
  extension: string;
  url: string;
}

// Create a simple interface to represent the file node structure for clarity
interface MegaFileNode {
  directory: boolean;
  name?: string;
  handle?: string;
  path?: { name: string }[];
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

    // --- THE DEFINITIVE FIX: CASTING 'storage.files' TO A MAP ---
    // We are telling TypeScript to trust us that storage.files is a Map.
    (storage.files as Map<string, MegaFileNode>).forEach((fileNode) => {
      if (fileNode.directory) {
        return;
      }

      const fileName = fileNode.name || 'unknown-file';
      const pathNames = (fileNode.path || []).map(parent => parent.name);
      
      const fullPath = pathNames.length > 0 
        ? `/${pathNames.join('/')}/${fileName}`
        : `/${fileName}`;

      const folderPath = pathNames.length > 0
        ? `/${pathNames.join('/')}`
        : '/';
        
      const extension = fileName.split('.').pop()?.toLowerCase() || '';

      files.push({
        id: fileIdCounter++,
        fileName,
        fullPath,
        folderPath,
        extension,
        url: `https://mega.nz/file/${fileNode.handle}`,
      });
    });

    res.status(200).json({ files });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('MEGA API Error:', error);
    res.status(500).json({ error: 'Failed to connect to MEGA or fetch files.', details: errorMessage });
  }
}