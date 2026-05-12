import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import RootApp from './RootApp'
import './styles.css'

// Catch unhandled promise rejections (async errors outside React lifecycle)
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault() // Suppress browser console output
})

// Catch synchronous errors outside React (e.g. third-party scripts)
window.addEventListener('error', (event) => {
  event.preventDefault()
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <RootApp />
    </BrowserRouter>
  </React.StrictMode>,
)
