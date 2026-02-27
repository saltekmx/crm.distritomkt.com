import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div className="flex items-center justify-center min-h-screen"><h1 className="text-2xl font-bold">DistritoMKT CRM</h1></div>} />
      </Routes>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  )
}

export default App
