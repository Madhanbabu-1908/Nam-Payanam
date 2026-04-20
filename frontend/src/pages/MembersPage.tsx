import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function MembersPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white p-4 shadow flex items-center gap-4">
        <button onClick={() => navigate(-1)}><ArrowLeft/></button>
        <h1 className="font-bold">Members</h1>
      </header>
      <main className="p-6 text-center text-gray-500">Member management coming soon.</main>
    </div>
  );
}