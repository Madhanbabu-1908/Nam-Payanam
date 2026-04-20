import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '../components/common/Button';

export default function SettingsPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const handleDelete = () => {
    if(window.confirm("Are you sure? This cannot be undone.")) {
      alert("Delete logic connected to backend here.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white p-4 shadow flex items-center gap-4">
        <button onClick={() => navigate(-1)}><ArrowLeft/></button>
        <h1 className="font-bold">Settings</h1>
      </header>
      <main className="max-w-2xl mx-auto p-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100">
          <h3 className="text-red-600 font-bold mb-2 flex items-center gap-2"><Trash2 size={20}/> Danger Zone</h3>
          <p className="text-gray-500 text-sm mb-4">Deleting the trip will remove all data permanently.</p>
          <Button variant="danger" onClick={handleDelete}>Delete Trip</Button>
        </div>
      </main>
    </div>
  );
}