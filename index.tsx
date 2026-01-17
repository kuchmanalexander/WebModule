
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SessionProvider } from './context/SessionProvider';
import { UiProvider } from './context/UiProvider';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  // NOTE: React.StrictMode в dev запускает useEffect дважды.
  // Для OAuth / Redis-flow это может приводить к двойному старту логина
  // и "прыгающему" состоянию (петли /dashboard <-> /).
  // Поэтому здесь StrictMode отключён.
  <UiProvider>
    <SessionProvider>
      <App />
    </SessionProvider>
  </UiProvider>
);
