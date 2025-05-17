import { NextApiRequest, NextApiResponse } from 'next';
import httpProxyMiddleware from 'next-http-proxy-middleware';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {

  const path = req.url?.replace(/^\/api/, '') || '';

  return httpProxyMiddleware(req, res, {
    target: 'http://146.190.186.116:8000',
    changeOrigin: true,
    pathRewrite: {
      '^/api': '/api',
    },
    secure: false,
  });
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
