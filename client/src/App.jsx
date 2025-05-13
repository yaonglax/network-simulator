import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import WelcomePage from './pages/welcomePage/WelcomePage'
import NetworkEditorPage from './pages/networkEditorPage/NetworkEditorPage'
import './styles/main.css'
import { useEffect } from 'react';

function App() {

  useEffect(() => {
    const handleFocusInputs = () => {
      // Находим первый инпут в модалке или на странице
      const input = document.querySelector('input, textarea, select, [contenteditable]');
      if (input) {
        input.focus();
        input.blur();
        setTimeout(() => input.focus(), 50);
      }
    };
  
    // Подписываемся на событие из main process
    window.electronAPI?.ipcRenderer?.on('focus-inputs', handleFocusInputs);
    
    return () => {
      window.electronAPI?.ipcRenderer?.off('focus-inputs', handleFocusInputs);
    };
  }, []);
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
