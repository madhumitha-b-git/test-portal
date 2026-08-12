import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Suppress benign ResizeObserver error overlays triggered by Monaco Editor and responsive layouts
if (typeof window !== "undefined") {
  const isResizeObserverError = (msg) =>
    typeof msg === "string" &&
    (msg.includes("ResizeObserver loop completed with undelivered notifications") ||
     msg.includes("ResizeObserver loop limit exceeded"));

  window.addEventListener(
    "error",
    (e) => {
      if (isResizeObserverError(e.message) || isResizeObserverError(e.error?.message)) {
        e.stopImmediatePropagation();
        e.preventDefault();
        return true;
      }
    },
    true
  );

  window.addEventListener("unhandledrejection", (e) => {
    if (
      isResizeObserverError(e.reason?.message) ||
      isResizeObserverError(e.reason)
    ) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });

  const prevOnError = window.onerror;
  window.onerror = function (msg, url, lineNo, columnNo, error) {
    if (isResizeObserverError(msg) || (error && isResizeObserverError(error.message))) {
      return true;
    }
    if (prevOnError) {
      return prevOnError.apply(this, arguments);
    }
    return false;
  };

  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      isResizeObserverError(args[0])
    ) {
      return;
    }
    originalConsoleError(...args);
  };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
