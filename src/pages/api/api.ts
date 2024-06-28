import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
      // Handle GET request
      res.status(200).json({ message: 'Hello, world!' });
    } else if (req.method === 'POST') {
      // Handle POST request
      const { data } = req.body;
      res.status(201).json({ message: 'Data saved successfully', data });
    } else if (req.method === 'PUT') {
      // Handle PUT request
      const { id, data } = req.body;
      res.status(200).json({ message: `Data with ID ${id} updated successfully`, data });
    } else if (req.method === 'DELETE') {
      // Handle DELETE request
      const { id } = req.body;
      res.status(200).json({ message: `Data with ID ${id} deleted successfully` });
    } else {
      // Handle unsupported HTTP methods
      res.status(405).json({ message: 'Method Not Allowed' });
    }
}