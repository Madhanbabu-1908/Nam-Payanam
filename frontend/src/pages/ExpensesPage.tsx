import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';

export default function ExpensesPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white p-4 shadow flex items-center gap-4">
        <button onClick={() => navigate(-1)}><ArrowLeft/></button>
        <h1 className="font-bold">Expenses</h1>
      </header>
      <main className="p-6 text-center">
        <p className="text-gray-500 mb-4">Expense tracking coming soon for Trip {tripId}</p>
        <button className="bg-green-600 text-white px-4 py-2 rounded-full shadow-lg fixed bottom-6 right-6"><Plus/></button>
      </main>
    </div>
  );
}