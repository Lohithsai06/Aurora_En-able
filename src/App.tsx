import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Blind from './pages/Blind';
import Deaf from './pages/Deaf';
import Dumb from './pages/Dumb';
import ADHD from './pages/ADHD';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/blind" element={<Blind />} />
          <Route path="/deaf" element={<Deaf />} />
          <Route path="/dumb" element={<Dumb />} />
          <Route path="/adhd" element={<ADHD />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </Router>
  );
}
