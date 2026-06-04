import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import Upload from '@/pages/Upload'
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import TagManager from '@/pages/TagManager'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-background">
          <Routes>
            <Route path="/" element={<Upload />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/tags" element={<TagManager />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
