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

// Interface to describe the shape of the file node object from the library
interface MegaFileNode {
  directory: boolean;
  name?: string;
  handle?: string;
  path?: { name:string }[];
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

    // --- THE FINAL, CORRECT WAY TO ITERATE OVER A PLAIN OBJECT ---
    // Object.values() gets all the file objects, and we loop over that array.
    // We use `as any` as a final measure to bypass the faulty library types.
    for (const fileNode of Object.values(storage.files as any)) {
      
      const node = fileNode as MegaFileNode; // Treat each item as our defined interface

      if (node.directory) {
        continue;
      }

      const fileName = node.name || 'unknown-file';
      const pathNames = (node.path || []).map(parent => parent.name);
      
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
        url: `https://mega.nz/file/${node.handle}`,
      });
    }

    res.status(200).json({ files });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('MEGA API Error:', error);
    res.status(500).json({ error: 'Failed to connect to MEGA or fetch files.', details: errorMessage });
  }
}