// Polyfill TextEncoder untuk jsPDF yang berjalan di JSDOM
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Set process.env var so babel-plugin-transform-vite-meta-env has a value to use
process.env.VITE_API_URL = 'http://localhost:3000/satya';
