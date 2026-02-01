from flask import Flask, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_mail import Mail, Message
import jwt
import hashlib
import datetime
from pymongo import MongoClient
from passlib.context import CryptContext
from flask_cors import CORS
from bson.objectid import ObjectId
import bcrypt
import logging
import re

# Flask App Configuration
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize passlib context for bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_scrypt_password(password, stored_password):
    try:
        # Extract scrypt parameters and hash from stored password
        params = stored_password.split('$')
        salt = params[2]
        stored_hash = params[3]

        # Recreate the scrypt hash and compare with stored hash
        computed_hash = hashlib.scrypt(password.encode(), salt=salt.encode(), n=32768, r=8, p=1).hex()
        
        return computed_hash == stored_hash
    except Exception as e:
        logging.error(f"Error verifying scrypt password: {e}")
        return False

# Configure Logging
logging.basicConfig(level=logging.INFO)

# MongoDB connection
client = MongoClient("mongodb://localhost:27017")  # Adjust the connection string as needed
db = client['course_enrollment']  # Database name
users_collection = db['users']  # Users collection
mentors_collection = db['mentors']  # Mentors collection
students_collection = db['students']  # Students collection

# Flask-Mail Configuration
app.config['MAIL_SERVER'] = 'smtp.gmail.com'  # Use your SMTP server
app.config['MAIL_PORT'] = 587  # Use the appropriate port (587 for TLS)
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = 'akulaliladivyajoythi@gmail.com'  # Your email address
app.config['MAIL_PASSWORD'] = 'smkq iezl sbdl yulf'  # Your email password
app.config['MAIL_DEFAULT_SENDER'] = 'akulaliladivyajoythi@gmail.com'

mail = Mail(app)

# Secret key for JWT token generation
SECRET_KEY = '71ae4e62a8a04ca9b0b9018d51a1963d0e9d862b9e44254f746f0b24ae3ec5c8'

@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    # Get email from request
    data = request.json
    email = data.get('email')

    if not email:
        return jsonify({"message": "Email is required"}), 400

    # Placeholder for user lookup in a database
    # Replace this with actual database query
    user_exists = True  # Simulate user existence

    if not user_exists:
        return jsonify({"message": "If the email exists, a reset link has been sent."}), 200
    
    # Generate a token valid for 30 minutes
    reset_token = jwt.encode(
        {
            "email": email,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=30)
        },
        SECRET_KEY,
        algorithm="HS256"
    )
    reset_link = f"http://localhost:3000/reset-password?token={reset_token}"

    try:
        # Send email with the reset link
        msg = Message(
            "Password Reset Request",
            sender="akulaliladivyajoythi@gmail.com",
            recipients=[email]
        )
        msg.body = f"Click the link below to reset your password:\n{reset_link}"
        mail.send(msg)
        return jsonify({"message": "If the email exists, a reset link has been sent."}), 200

    except Exception as e:
        print(f"Error sending email: {e}")
        return jsonify({"message": "Failed to send reset link. Please try again later."}), 500
    
@app.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    token = data.get('token')
    new_password = data.get('new_password')

    if not token or not new_password:
        return jsonify({"message": "Token and new password are required"}), 400

    try:
        # Decode the token and check for expiration
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        email = decoded.get('email')

                # Check if the user exists in the database
        user = users_collection.find_one({"email": email})
        if not user:
            return jsonify({"message": "User not found"}), 404

        # Hash the new password
        hashed_password = pwd_context.hash(new_password)

        # Update the user's password in the database
        users_collection.update_one(
            {"email": email},
            {"$set": {"password": hashed_password}}
        )

        # Update the password in the database (hash the password before storing)
        # Example: update_user_password(email, new_password)

        return jsonify({"message": "Password reset successfully"}), 200

    except jwt.ExpiredSignatureError:
        return jsonify({"message": "Reset token has expired"}), 400
    except jwt.InvalidTokenError:
        return jsonify({"message": "Invalid reset token"}), 400






# Helper Functions
def make_response(message, status_code):
    """Standardized JSON response format."""
    return jsonify({"message": message}), status_code

def is_email_valid(email):
    """Validate email format."""
    return bool(re.match(r"[^@]+@[^@]+\.[^@]+", email))

# Function to get faculty email from the database
def get_faculty_email(faculty_name):
    # Assuming you have a 'faculty' collection with emails
    faculty = db["mentors"].find_one({"facultyName": faculty_name})
    if faculty:
        return faculty.get("emailId")
    return None


@app.route('/send-faculty-email', methods=['POST'])
def send_faculty_email():
    try:
        # Get the faculty name from the request body
        data = request.get_json()
        faculty_name = data.get('facultyName')

        # Validate the incoming data
        if not faculty_name:
            return make_response("Faculty Name is required", 400)

        # Fetch the faculty email
        faculty_email = get_faculty_email(faculty_name)
        if not faculty_email:
            return make_response("Faculty email not found", 404)

        # Fetch the list of students assigned to the faculty
        students = list(students_collection.find({"facultyName": faculty_name}))

        # If no students are found
        if not students:  # Check if the list is empty
            return make_response(f"No students found for faculty {faculty_name}", 404)

        # Prepare the email content
        subject = f"New Student Assignments for {faculty_name}"
        body = f"Dear {faculty_name},\n\nYou have been assigned the following students:\n\n"

        for student in students:
            student_name = student.get("studentName")
            registration_number = student.get("regNo")
            year = student.get("year")
            body += f"- Name: {student_name}\n  Registration Number: {registration_number}\n  Year: {year}\n\n"

        body += "Best regards,\nSathyabama University"

        # Create and send the email
        msg = Message(subject, recipients=[faculty_email])
        msg.body = body
        mail.send(msg)

        logging.info(f"Email sent to {faculty_email} about students.")
        return make_response("Email sent successfully!", 200)

    except Exception as e:
        logging.error(f"Error sending email: {str(e)}")
        return make_response(f"An error occurred while sending the email: {str(e)}", 500)



# Routes
@app.route('/')
def home():
    """Root route to handle base URL."""
    return jsonify({"message": "Welcome to the Course Enrollment API!"})

@app.route('/favicon.ico')
def favicon():
    """Handle favicon.ico requests."""
    return '', 204

@app.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()

        # Extracting fields
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        confirmPassword = data.get("confirmPassword")

        # Validation
        if not all([name, email, password, confirmPassword]):
            return make_response("All fields are required", 400)
        if password != confirmPassword:
            return make_response("Passwords do not match", 400)
        if not is_email_valid(email):
            return make_response("Invalid email address", 400)
                # Check if the user already exists
        existing_user = users_collection.find_one({"email": email})
        if existing_user:
            return make_response("User already exists with this email", 400)

        # Hash password and save to MongoDB
        #hashed_password = generate_password_hash(password)
  
         # Hash password using bcrypt for new users
        hashed_password = pwd_context.hash(password)

        users_collection.insert_one({
            "name": name,
            "email": email,
            "password": hashed_password
        })

        return make_response("User registered successfully", 201)
    except Exception as e:
        logging.error(f"Error in signup: {str(e)}")
        return make_response(f"An error occurred: {str(e)}", 500)

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()

        # Extracting fields
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return make_response("Email and password are required", 400)

        # Check if user exists
        user = users_collection.find_one({"email": email})
        if not user:
            return make_response("User not found", 404)
        

        # Retrieve stored password hash
        stored_password = user["password"]

        # Verify password
        #if not check_password_hash(user["password"], password):
         #   return make_response("Invalid password", 401)
                # Check if the password is hashed using bcrypt
        if stored_password.startswith('$2b$'):
            # If bcrypt hash, use pwd_context.verify
            if not pwd_context.verify(password, stored_password):
                return make_response("Invalid password", 401)
        
        # Handle scrypt hashed password
        elif stored_password.startswith('scrypt:'):
            # Verify scrypt password
            if not verify_scrypt_password(password, stored_password):
                return make_response("Invalid password", 401)

            # If password is valid, migrate to bcrypt
            bcrypt_hash = pwd_context.hash(password)
            users_collection.update_one({"email": email}, {"$set": {"password": bcrypt_hash}})
            logging.info(f"Password for {email} migrated to bcrypt")

        else:
            return make_response("Unknown password hash format", 400)


        logging.info(f"User {email} logged in successfully")
        return make_response("Login successful", 200)
    except Exception as e:
        logging.error(f"Error in login: {str(e)}")
        return make_response(f"An error occurred: {str(e)}", 500)

@app.route('/enroll-mentor', methods=['GET', 'POST'])
def enroll_mentor():
    if request.method == 'GET':
        try:
            # Retrieve all mentors from the collection
            mentors = list(mentors_collection.find({}, {"_id": 0}))  # Exclude MongoDB's _id field
            if not mentors:
                return make_response("No mentors found", 404)
            return jsonify(mentors), 200
        except Exception as e:
            logging.error(f"Error in GET enroll_mentor: {str(e)}")
            return make_response(f"An error occurred: {str(e)}", 500)

    elif request.method == 'POST':
        try:
            data = request.get_json()

            # Extracting fields from the request
            faculty_name = data.get("facultyName")
            erp_id = data.get("erpId")
            department = data.get("department")
            email_id = data.get("emailId")
            course_name = data.get("courseName")
            instructor_name = data.get("instructorName")
            duration = data.get("duration")

            # Validation
            if not all([faculty_name, erp_id, department, email_id, course_name, instructor_name, duration]):
                return make_response("All fields are required", 400)
            if not is_email_valid(email_id):
                return make_response("Invalid email address", 400)

            # Check if mentor already exists based on ERP ID or Email
            if mentors_collection.find_one({"$or": [{"erpId": erp_id}, {"emailId": email_id}]}):
                return make_response("Mentor already exists", 400)

            # Insert mentor data into MongoDB
            mentors_collection.insert_one({
                "facultyName": faculty_name,
                "erpId": erp_id,
                "department": department,
                "emailId": email_id,
                "courseName": course_name,
                "instructorName": instructor_name,
                "duration": duration
            })

            return make_response("Mentor enrolled successfully", 201)
        except Exception as e:
            logging.error(f"Error in POST enroll_mentor: {str(e)}")
            return make_response(f"An error occurred: {str(e)}", 500)
@app.route('/enroll-student', methods=['POST'])
def enroll_student():
    try:
        data = request.get_json()
        logging.info(f"Received data: {data}")

        # Extracting fields from the request
        student_name = data.get("name")
        reg_no = data.get("regNo")
        year = data.get("year")
        email_id = data.get("email")
        course_name = data.get("courseName")
        duration = data.get("duration")
        instructor_name = data.get("instructorName")
        faculty_name = data.get("facultyName")

        # Validation
        if not all([student_name, reg_no, year, email_id, course_name, duration, instructor_name, faculty_name]):
            logging.warning("Validation failed: Missing fields")
            return make_response("All fields are required", 400)
        if not is_email_valid(email_id):
            logging.warning(f"Invalid email: {email_id}")
            return make_response("Invalid email address", 400)

        # Check for duplicate entry
        if students_collection.find_one({"emailId": email_id}):
            logging.warning(f"Duplicate entry attempt: {email_id}")
            return make_response("Student already enrolled", 400)

        # Check faculty capacity
        student_count = students_collection.count_documents({"facultyName": faculty_name, "courseName": course_name})
        logging.info(f"Checking capacity for faculty {faculty_name}: current count = {student_count}")

        if student_count >= 30:
            return make_response("Faculty is full", 400)

        # Insert student data into MongoDB
        result = students_collection.insert_one({
            "studentName": student_name,
            "regNo": reg_no,
            "year": year,
            "emailId": email_id,
            "courseName": course_name,
            "duration": duration,
            "instructorName": instructor_name,
            "facultyName": faculty_name
        })
        logging.info(f"Student enrolled successfully with ID: {result.inserted_id}")

        return make_response("Student enrolled successfully", 201)
    except Exception as e:
        logging.error("Error in enroll_student", exc_info=True)
        return make_response(f"An error occurred: {str(e)}", 500)


@app.route('/get-faculties', methods=['GET'])
def get_faculties():
    try:
        # Extract and trim query parameters
        course_name = request.args.get('courseName', '').strip()
        instructor_name = request.args.get('instructorName', '').strip()
        duration = request.args.get('duration', '').strip()

        # Log received query parameters
        logging.info(f"Query Parameters Received - CourseName: {course_name}, InstructorName: {instructor_name}, Duration: {duration}")

        # Build the query dictionary with case-insensitive and trimmed inputs
        query = {}
        if course_name:
            query["courseName"] = {"$regex": f"^{course_name}$", "$options": "i"}  # Exact match, case insensitive
        if instructor_name:
            query["instructorName"] = {"$regex": f"^{instructor_name}$", "$options": "i"}
        if duration:
            query["duration"] = {"$regex": f"^{duration}$", "$options": "i"}

        # Fetch filtered mentors based on the constructed query
        mentors = list(mentors_collection.find(query))

        # Log the matching records
        logging.info(f"Matching Mentors: {mentors}")

        # If no mentors are found, return a message indicating that
        if not mentors:
            return make_response("No faculties found with the given filters", 404)

        # Prepare the list of mentor objects with all required details
        faculties = [
            {
                "facultyName": mentor.get("facultyName", "Unknown Faculty"),
                "courseName": mentor.get("courseName", "Unknown Course"),
                "instructorName": mentor.get("instructorName", "Unknown Instructor"),
                "duration": mentor.get("duration", "Unknown Duration")
            }
            for mentor in mentors
        ]

        # Return the list of faculty objects as a JSON response
        return jsonify({"faculties": faculties}), 200

    except Exception as e:
        # Log and handle exceptions
        logging.error(f"Error in get_faculties: {str(e)}")
        return make_response(f"An error occurred: {str(e)}", 500)


@app.route('/get-students', methods=['GET'])
def get_students():
    try:
        # Retrieve all students from the collection
        students = list(students_collection.find({}, {"_id": 0}))  # Exclude MongoDB's _id field
        if not students:
            return make_response("No students found", 404)
        return jsonify(students), 200
    except Exception as e:
        logging.error(f"Error in GET get_students: {str(e)}")
        return make_response(f"An error occurred: {str(e)}", 500)

@app.route('/get-assigned-students', methods=['GET'])
def get_assigned_students():
    try:
        # Extract query parameters
        faculty_name = request.args.get('facultyName', '').strip()
        erp_id = request.args.get('erpId', '').strip()

        # Log received query parameters
        logging.info(f"Query Parameters Received - FacultyName: {faculty_name}, ErpId: {erp_id}")

        # Build the query dictionary for filtering students
        query = {}

        # If erpId is provided, find the corresponding facultyName from the mentors collection
        if erp_id:
            # Query the mentors collection to get the facultyName using erpId
            mentor = mentors_collection.find_one({"erpId": erp_id}, {"_id": 0, "facultyName": 1})

            if mentor:
                # Use the facultyName from the mentor data to filter students
                faculty_name = mentor['facultyName']
                logging.info(f"Found facultyName from ERP ID {erp_id}: {faculty_name}")
            else:
                return make_response(f"No mentor found with ERP ID {erp_id}", 404)

        if faculty_name:
            query["facultyName"] = {"$regex": f"^{faculty_name}$", "$options": "i"}  # Exact match, case-insensitive

        # Fetch assigned students based on the constructed query
        students = list(students_collection.find(query, {"_id": 0}))  # Exclude MongoDB's _id field
        if not students:
            return make_response("No students assigned to the given faculty", 404)

        # Return the list of students as a JSON response
        return jsonify({"assignedStudents": students}), 200

    except Exception as e:
        # Log and handle exceptions
        logging.error(f"Error in get_assigned_students: {str(e)}")
        return make_response(f"An error occurred: {str(e)}", 500)

# Main
if __name__ == "__main__":
    app.run(debug=True)