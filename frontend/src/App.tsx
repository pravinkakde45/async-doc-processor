
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { TopBarProvider } from './context/TopBarContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Upload } from './pages/Upload';
import { DocumentDetail } from './pages/DocumentDetail';

import { AuthProvider } from './context/AuthContext';
import { Analytics } from './pages/Analytics';
import { Workflows } from './pages/Workflows';
import { Settings } from './pages/Settings';

function App() {
  return (
    <ThemeProvider>
      <TopBarProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="upload" element={<Upload />} />
                <Route path="documents/:id" element={<DocumentDetail />} />
                <Route path="documents" element={<Dashboard />} />
                <Route path="workflows" element={<Workflows />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TopBarProvider>
    </ThemeProvider>
  );
}

export default App;
