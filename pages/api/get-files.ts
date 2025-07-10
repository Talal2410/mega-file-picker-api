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

// Interface to describe the shape of the file node object, updated with our findings
interface MegaFileNode {
  directory: boolean;
  name?: string;
  nodeId?: string; // We discovered the handle is called nodeId!
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

    // --- PRODUCTION CODE ---
    // This now loops through all files and uses the correct `nodeId` property.

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const fileNode of Object.values(storage.files as any)) {
      
      const node = fileNode as MegaFileNode;

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
        // Use the correct property: `node.nodeId`
        url: `https://mega.nz/file/${node.nodeId}`,
      });
    }

    res.status(200).json({ files });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('MEGA API Error:', error);
    res.status(500).json({ error: 'Failed to connect to MEGA or fetch files.', details: errorMessage });
  }
}