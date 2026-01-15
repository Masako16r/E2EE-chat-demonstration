import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Welcome } from './pages/Welcome';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Demonstration } from './pages/Demonstration';
import './styles/palette.css';
import './App.css';

function App() {
  return (
    <Router>
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/chat" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/demonstration" element={<Demonstration />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
