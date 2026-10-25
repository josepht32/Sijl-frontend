import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExecutiveDashboardPage } from './pages/ExecutiveDashboardPage';
import { CasesListPage } from './pages/CasesListPage';
import { CreateCasePage } from './pages/CreateCasePage';
import { CaseDetailsPage } from './pages/CaseDetailsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { UsersPage } from './pages/UsersPage';
import { RolesPage } from './pages/RolesPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/executive" element={<ExecutiveDashboardPage />} />
              <Route path="/cases" element={<CasesListPage />} />
              <Route path="/cases/new" element={<CreateCasePage />} />
              <Route path="/cases/:id" element={<CaseDetailsPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/departments" element={<DepartmentsPage />} />
              <Route path="/employees" element={<UsersPage />} />
              <Route path="/roles" element={<RolesPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
