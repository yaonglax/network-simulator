import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import WelcomePage from './pages/welcomePage/WelcomePage'
import NetworkEditorPage from './pages/networkEditorPage/NetworkEditorPage'
import './styles/main.css'

function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path='/editor' element={<NetworkEditorPage />}/>
      </Routes>
    </Router>
  )
}

export default App
