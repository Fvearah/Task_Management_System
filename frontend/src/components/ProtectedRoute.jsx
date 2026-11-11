import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-8">
        {/* key = pathname agar animasi masuk berjalan di setiap pindah halaman */}
        <div key={pathname} className="page-enter mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ProtectedRoute;