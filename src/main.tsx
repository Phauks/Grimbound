import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'
import { DataSyncProvider } from './contexts/DataSyncContext'
import './styles/index.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <DataSyncProvider>
        <App />
      </DataSyncProvider>
    </ThemeProvider>
  </React.StrictMode>
)
