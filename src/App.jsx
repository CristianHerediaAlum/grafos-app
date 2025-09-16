import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'
import Grafo from './components/Grafo'

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4 text-center text-black">Mi grafo</h1>
      <Grafo></Grafo>
    </div>
  )
}

export default App
