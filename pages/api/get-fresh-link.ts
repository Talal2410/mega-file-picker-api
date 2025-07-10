// pages/api/get-fresh-link.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Storage } from 'megajs';

// A simple interface for the file node to help with type safety
interface MegaFileNode {
  link: (options?: object) => Promise<string>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Increase the maximum duration for this function on Vercel (requires Pro plan to exceed 10-15s)
  // This tells Vercel to allow more time for the MEGA connection and file tree processing.
  res.setHeader('x-vercel-max-duration', '60'); 

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { path } = req.body;

  if (!path) {
    return res.status(400).json({ error: 'File path is required.' });
  }

  if (!process.env.MEGA_EMAIL || !process.env.MEGA_PASSWORD) {
    return res.status(500).json({ error: 'MEGA credentials are not configured on the server.' });
  }

  try {
    const storage = new Storage({
      email: process.env.MEGA_EMAIL,
      password: process.env.MEGA_PASSWORD,
    });

    // This promise resolves after authentication and the initial (potentially long) file tree download.
    await storage.ready;

    // Use the library's intended method for finding a file by its full path.
    const fileNode = storage.find(path) as MegaFileNode | undefined;

    if (!fileNode) {
      // If not found, it's possible the path from the text file has a leading '/' but find doesn't want it.
      // Let's try again without the leading slash as a fallback.
      const fallbackPath = path.startsWith('/') ? path.substring(1) : path;
      const fallbackNode = storage.find(fallbackPath) as MegaFileNode | undefined;

      if (!fallbackNode) {
        return res.status(404).json({ error: `File not found at path: ${path}` });
      }
      
      const freshUrl = await fallbackNode.link({});
      return res.status(200).json({ url: freshUrl });
    }

    // Call the link method with an empty options object to satisfy TypeScript.
    const freshUrl = await fileNode.link({});

    res.status(200).json({ url: freshUrl });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('MEGA API Error:', error);
    res.status(500).json({ error: 'Failed to generate link.', details: errorMessage });
  }
}