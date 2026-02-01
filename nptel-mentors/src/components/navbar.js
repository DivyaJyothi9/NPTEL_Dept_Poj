import React from 'react';
import { Link ,useNavigate} from 'react-router-dom'; // Import Link for routing

const Navbar = () => {
  const navigate = useNavigate(); // Hook to navigate after logout

  // Function to handle logout
  const handleLogout = () => {
    // Clear session or authentication data
    localStorage.removeItem('user'); // Or sessionStorage.removeItem('user') based on your setup
    sessionStorage.removeItem('user');

    // Redirect to login page after logout
    navigate('/login'); // Adjust to the path where you have your login page
  };
  return (
    <nav className="p-4 sticky top-0 z-50 bg-[#003366]">
      <div className="container mx-auto flex items-center justify-between">
        {/* Logo Section */}
        <Link to="/" className="flex items-center">
          <img
            src="/images/sistlogo.png" // Path to your logo image in the public directory
            alt="Logo"
            className="h-8 mr-3" // Adjust size and add margin-right for spacing
          />
          <span className="text-white text-2xl font-bold">Sathyabama - NPTEL Enrollment</span>
        </Link>
        
        {/* NPTEL Logo */}
        <div className="flex items-center">
          <img
            src="/images/nptelogo.jpeg" // Path to your NPTEL logo image
            alt="NPTEL Logo"
            className="h-8 mr-4" // Adjust size as needed and add margin-right
          />

          {/* Navigation Links */}
          <div className="space-x-4">
            <Link to="/courses" className="text-white hover:bg-gray-700 px-3 py-2 rounded">
              Courses
            </Link>
            <Link to="/mentors" className="text-white hover:bg-gray-700 px-3 py-2 rounded">
              Mentors
            </Link>
            <Link to="/students" className="text-white hover:bg-gray-700 px-3 py-2 rounded">
              Students
            </Link>
            <Link to="/view-assigned-students" className="text-white  hover:bg-gray-700 px-3 py-2 rounded">
            View Assigned Students
            </Link>

                      {/* Logout Button */}
                      <button
              onClick={handleLogout}
              className="text-white hover:bg-red-700 px-3 py-2 rounded"
            >
              Logout
            </button>

          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
