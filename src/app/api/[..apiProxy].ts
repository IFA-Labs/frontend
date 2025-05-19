import { createProxyMiddleware } from 'http-proxy-middleware';
import { NextApiRequest, NextApiResponse } from 'next';

// Configure the proxy
const apiProxy = createProxyMiddleware({
  target: 'http://146.190.186.116:8000',
  changeOrigin: true,
  pathRewrite: {
    '^/api/': '/api/', // keeps the /api prefix
  },
  secure: false, // Don't verify SSL certificates
});

export default function handler(req, res) {
  // Don't run middleware on OPTIONS requests (for CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Forward the request to the API server
  return apiProxy(req, res);
}

// To handle API routes in Next.js
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
