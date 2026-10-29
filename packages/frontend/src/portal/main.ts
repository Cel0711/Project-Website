import '../styles/main.css';
import './portal.css';
import { startPortal } from './app.js';

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startPortal);
else startPortal();
