import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext'; // Import the context
import axios from 'axios'; // Import Axios for API calls

const Mentors = ({ faculties }) => {
  const { selectedMentor, setStudentDetails } = useContext(AppContext); // Destructure only necessary context values

  const [formValues, setFormValues] = useState({
    facultyName: '',
    erpId: '',
    department: '',
    emailId: '',
    courseName: '',
    instructorName: '',
    duration: ''
  });

  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Clear the student details when the selected mentor changes
    setStudentDetails({});
  }, [selectedMentor, setStudentDetails]); // Ensure selectedMentor is a dependency

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  const validateEmail = (email) => {
    // Basic email validation
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleEnroll = async () => {
    // Validate fields
    const requiredFields = [
      { name: 'facultyName', message: 'Please fill out the Faculty Name field.' },
      { name: 'erpId', message: 'Please fill out the ERP ID field.' },
      { name: 'department', message: 'Please fill out the Department field.' },
      { name: 'emailId', message: 'Please fill out a valid Email ID field.' },
      { name: 'courseName', message: 'Please fill out the Course Name field.' },
      { name: 'instructorName', message: 'Please fill out the Instructor Name field.' },
      { name: 'duration', message: 'Please fill out the Duration field.' }
    ];

    for (const field of requiredFields) {
      if (!formValues[field.name] || (field.name === 'emailId' && !validateEmail(formValues.emailId))) {
        alert(field.message); // Show popup message
        return;
      }
    }

    // If validation passes, make the API call to save the mentor details
    setLoading(true); // Start loading state
    try {
      await axios.post('http://localhost:5000/enroll-mentor', formValues); // Flask endpoint
      setMessage('Enrolled successfully');
      setTimeout(() => setMessage(''), 2000);

      // Clear form values after successful enrollment
      setFormValues({
        facultyName: '',
        erpId: '',
        department: '',
        emailId: '',
        courseName: '',
        instructorName: '',
        duration: ''
      });
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'An error occurred while enrolling. Please try again.');
      setTimeout(() => setErrorMessage(''), 5000); // Clear error message after 5 seconds
      console.error(error);
    } finally {
      setLoading(false); // Stop loading state
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="bg-[#800000] p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-white">Course Enrollment</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="font-bold text-white mb-1">Faculty Name:</label>
              <input
                type="text"
                name="facultyName"
                value={formValues.facultyName}
                onChange={handleChange}
                placeholder="Faculty Name"
                className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-700 font-bold"
              />
            </div>

            <div className="flex flex-col">
              <label className="font-bold text-white mb-1">ERP ID:</label>
              <input
                type="text"
                name="erpId"
                value={formValues.erpId}
                onChange={handleChange}
                placeholder="ERP ID"
                className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-700 font-bold"
              />
            </div>

            <div className="flex flex-col">
              <label className="font-bold text-white mb-1">Department:</label>
              <input
                type="text"
                name="department"
                value={formValues.department}
                onChange={handleChange}
                placeholder="Department"
                className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-700 font-bold"
              />
            </div>

            <div className="flex flex-col">
              <label className="font-bold text-white mb-1">Email ID:</label>
              <input
                type="email"
                name="emailId"
                value={formValues.emailId}
                onChange={handleChange}
                placeholder="Email ID"
                className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-700 font-bold"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="font-bold text-white mb-1">Course Name:</label>
              <input
                type="text"
                name="courseName"
                value={formValues.courseName}
                onChange={handleChange}
                placeholder="Course Name"
                className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-700 font-bold"
              />
            </div>

            <div className="flex flex-col">
              <label className="font-bold text-white mb-1">Instructor Name:</label>
              <input
                type="text"
                name="instructorName"
                value={formValues.instructorName}
                onChange={handleChange}
                placeholder="Instructor Name"
                className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-700 font-bold"
              />
            </div>

            <div className="flex flex-col">
              <label className="font-bold text-white mb-1">Duration:</label>
              <input
                type="text"
                name="duration"
                value={formValues.duration}
                onChange={handleChange}
                placeholder="Duration"
                className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-700 font-bold"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={handleEnroll}
            className="bg-blue-800 hover:bg-blue-800 text-white px-6 py-3 rounded font-bold"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Enroll'}
          </button>
        </div>

        {message && (
          <div className="mt-4 text-center text-green-500 font-bold">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 text-center text-red-500 font-bold">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default Mentors;