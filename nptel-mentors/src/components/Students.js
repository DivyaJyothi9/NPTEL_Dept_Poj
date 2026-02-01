import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';

const Students = () => {
  const { setStudentDetails, setSelectedMentor } = useContext(AppContext);
  const [students, setStudents] = useState([]);
  const [faculties, setFaculties] = useState([]); // Ensure local state for faculties
  const [filteredFaculties, setFilteredFaculties] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    regNo: '',
    year: '',
    email: '',
    courseName: '',
    duration: '',
    instructorName: '',
    facultyName: ''
  });
  const [message, setMessage] = useState('');

  console.log(faculties);

  const MAX_STUDENTS_PER_FACULTY = 30;

    // Fetch students when the component loads
    useEffect(() => {
      const fetchStudents = async () => {
        try {
          const response = await fetch('http://127.0.0.1:5000/get-students');
          const data = await response.json();
          console.log('Fetched students:', data); // Log the fetched students
          if (response.ok) {
            setStudents(data); // Update the state with fetched students
          } else {
            console.error('Error fetching students:', data.message);
          }
        } catch (error) {
          console.error('Error fetching students:', error);
        }
      };
  
      fetchStudents();
    }, []); // Run only once when the component mounts

  // Fetch faculties based on course name, instructor name, and duration
  useEffect(() => {
    const fetchFaculties = async () => {
      if (formData.courseName && formData.instructorName && formData.duration) {
        try {
          const query = new URLSearchParams({
            courseName: formData.courseName,
            instructorName: formData.instructorName,
            duration: formData.duration
          }).toString();

          const response = await fetch(`http://127.0.0.1:5000/get-faculties?${query}`);
          const data = await response.json();
          console.log(data); // To see the updated response

          if (response.ok) {
            // Now faculties should be an array of objects
            const facultiesFiltered = data.faculties
            .map(faculty => ({
              ...faculty,
              count: isNaN(faculty.count) ? 0 : faculty.count // Ensure count is always a valid number
            }))

            .filter(faculty =>
              faculty.courseName === formData.courseName &&
              faculty.instructorName === formData.instructorName &&
              faculty.duration === formData.duration
            );

           

            setFaculties(facultiesFiltered);
            setFilteredFaculties(facultiesFiltered);
          } else {
            setMessage(data.message || 'Error fetching faculties.');
          }
        } catch (error) {
          console.error('Error fetching faculties:', error);
          setMessage('Error fetching faculties.');
        }
      }
    };

    fetchFaculties();
  }, [formData.courseName, formData.instructorName, formData.duration]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

 // Function to send email to the faculty when a student is assigned
const handleAssignFaculty = async (facultyName, studentName) => {
  try {
    // Send POST request to the backend with both facultyName and studentName
    const response = await fetch('http://127.0.0.1:5000/send-faculty-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        facultyName,   // Faculty name selected
        studentName,   // Student name being assigned
      }),
    });

    // Wait for response data
    //const data = await response.json();
        // Check if the response is JSON
        const contentType = response.headers.get('Content-Type');
        let data = {};
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const errorMessage = await response.text(); // Read response as text
          console.error('Error:', errorMessage);
          alert(`Error: ${errorMessage}`);
          return;
        }

    if (response.ok) {
      console.log('Email sent successfully!');
      alert('Email sent successfully!');
    } else {
      console.error('Error:', data.message);
      alert(`Error: ${data.message}`);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred while sending the email.');
  }
};


  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (students.some(student => student.regNo === formData.regNo)) {
      setMessage('Registration number already exists.');
      return;
    }
  
    const selectedFaculty = filteredFaculties.find(faculty => faculty.facultyName === formData.facultyName);
  
    if (!formData.facultyName) {
      setMessage('Please select a faculty.');
      return;
    }
  
    if (selectedFaculty && selectedFaculty.count >= MAX_STUDENTS_PER_FACULTY) {
      setMessage('The selected faculty is already full.');
      return;
    }
  
    if (selectedFaculty) {
      const newStudent = { ...formData };
  
      // Send the student data to the backend
      try {
        const response = await fetch('http://127.0.0.1:5000/enroll-student', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newStudent),
        });
  
        const data = await response.json();
  
        if (response.ok) {
          console.log('Student enrolled:', data);
          // Update local state
          setStudents(prevStudents => [...prevStudents, newStudent]);
          setFaculties(prevFaculties =>
            prevFaculties.map(faculty =>
              faculty.facultyName === formData.facultyName
                ? { ...faculty, count: faculty.count + 1 }
                : faculty
            )
          );
  
          setStudentDetails(prev => ({
            ...prev,
            [formData.facultyName]: [
              ...(prev[formData.facultyName] || []),
              {
                regNo: formData.regNo,
                year: formData.year,
                courseName: formData.courseName,
                email: formData.email
              }
            ]
          }));
  
          setSelectedMentor(formData.facultyName);
          handleAssignFaculty(formData.facultyName, formData.name);
  
          setFormData({
            name: '',
            regNo: '',
            year: '',
            email: '',
            courseName: '',
            duration: '',
            instructorName: '',
            facultyName: ''
          });
          setMessage('Enrolled successfully.');
  
          setTimeout(() => setMessage(''), 1000);
        } else {
          setMessage(data.message || 'Error enrolling student.');
        }
      } catch (error) {
        console.error('Error enrolling student:', error);
        setMessage('Error enrolling student.');
      }
    }
  };
  
  
  return (
    <div className="container mx-auto p-6">
      <div className="bg-[#800000] p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-white">Course Enrollment</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="flex flex-col">
                <label className="font-bold text-white mb-1">Name:</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Student Name"
                  className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-700 font-bold"
                  required
                />
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-white mb-1">Reg No:</label>
                <input
                  type="text"
                  name="regNo"
                  value={formData.regNo}
                  onChange={handleChange}
                  placeholder="Registration Number"
                  className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-700 font-bold"
                  required
                />
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-white mb-1">Year:</label>
                <input
                  type="text"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  placeholder="Year"
                  className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-700 font-bold"
                  required
                />
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-white mb-1">Email ID:</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email ID"
                  className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-700 font-bold"
                  required
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
                  value={formData.courseName}
                  onChange={handleChange}
                  placeholder="Course Name"
                  className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-700 font-bold"
                  required
                />
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-white mb-1">Instructor Name:</label>
                <input
                  type="text"
                  name="instructorName"
                  value={formData.instructorName}
                  onChange={handleChange}
                  placeholder="Instructor Name"
                  className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-700 font-bold"
                  required
                />
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-white mb-1">Duration:</label>
                  {/* Updated to Dropdown */}
                  <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-700 font-bold"
                  required
                >
                  <option value="">Select Duration</option>
                  <option value="4 weeks">4 weeks</option>
                  <option value="8 weeks">8 weeks</option>
                  <option value="12 weeks">12 weeks</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-white mb-1">Faculty Name:</label>
                <select
  name="facultyName"
  value={formData.facultyName}
  onChange={handleChange}
  className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-700 font-bold"
  required
>
  <option value="">Select Faculty</option>
  {filteredFaculties.length > 0 ? (
    filteredFaculties.map(faculty => (
      <option key={faculty.facultyName} value={faculty.facultyName}>
        {faculty.facultyName}
      </option>
    ))
  ) : (
    <option value="">No faculties available</option>
  )}
</select>

              
                            </div>
                          </div>
                        </div>
              
                        <div className="mt-6 flex justify-center">
                          <button
                            type="submit"
                            className="bg-blue-800 hover:bg-blue-800 text-white px-6 py-3 rounded font-bold"
                          >
                            Enroll
                          </button>
                        </div>
                      </form>
              
                      {message && (
                        <div className="mt-4 text-center text-green-500 font-bold">
                          {message}
                        </div>
                      )}
                    </div>
                  </div>
                );
              };
              
              export default Students;