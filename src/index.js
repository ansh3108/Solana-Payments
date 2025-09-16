import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App'
import { WalletContextProvider } from './WalletProvider';

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <WalletContextProvider>
    <App />
  </WalletContextProvider>
)