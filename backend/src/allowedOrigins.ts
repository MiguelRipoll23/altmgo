/**
 * Origins the browser site may call the API from.
 *
 * The site is deployed on Vercel and the backend is the mgo2-web-backend
 * container, so the calls are cross-origin. The two localhost ports are the
 * development frontend (`vite`) and the older `vercel dev` arrangement.
 */
export const allowedOrigins = [
  'https://altmgo.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];
