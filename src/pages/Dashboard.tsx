import { useAuth } from '@/hooks/useAuth';
import TeamDashboard from './TeamDashboard';
import AdminDashboard from './AdminDashboard';

export default function Dashboard() {
  const { isAdmin } = useAuth();

  return isAdmin ? <AdminDashboard /> : <TeamDashboard />;
}