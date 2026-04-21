// Add User to imports
import { PlusCircle, MapPin, LogOut, User } from 'lucide-react'; 

// ... inside the return statement ...
<nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10">
  <span className="text-xl font-bold text-indigo-600 flex items-center gap-2">🚌 Nam-Payanam</span>
  <div className="flex items-center gap-4">
    {user?.email && <span className="text-sm text-gray-600 hidden sm:block">{user.email}</span>}
    
    {/* ✅ NEW: Link to Profile Page */}
    <button 
      onClick={() => navigate('/profile')} 
      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition"
      title="My Profile"
    >
      <User size={20} />
    </button>

    <button onClick={() => signOut()} className="text-gray-500 hover:text-red-600 transition"><LogOut size={20}/></button>
  </div>
</nav>