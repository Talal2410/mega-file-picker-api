// pages/api/get-fresh-link.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Storage } from 'megajs';

// A simple interface for the file node to help with type safety
interface MegaFileNode {
  // The link method expects an options object, even if it's empty
  link: (options?: object) => Promise<string>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

    await storage.ready;

    const fileNode = storage.find(path) as MegaFileNode | undefined;

    if (!fileNode) {
      return res.status(404).json({ error: `File not found at path: ${path}` });
    }

    // --- THE FIX ---
    // Provide an empty options object {} to the link() method.
    const freshUrl = await fileNode.link({});

    res.status(200).json({ url: freshUrl });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('MEGA API Error:', error);
    res.status(500).json({ error: 'Failed to generate link.', details: errorMessage });
  }
}