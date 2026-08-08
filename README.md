🏙️ UrbanResolve (Smart India Hackathon ID25128)
UrbanResolve (also known as Civic Eye / SwachhLink) is a comprehensive, full-stack civic reporting and circular waste economy platform. Designed for the Smart India Hackathon (Student Innovation Category), this system bridges the gap between citizens and municipal administrators to rapidly identify, track, and resolve urban infrastructure and sanitization issues.

🚀 Live Demo & Access
Live Website: https://urbanresolve.onrender.com

To explore the platform's features without registering, please use the following demo credentials:

# you can always create ur own accounts in the website just dont forget to use legtimate mail ids

citizen Dashboard :

Email: testurbanresolve@gmail.com

Password: test@123

municipal staff portal:

Email: rajankunte@municipalcorporation.in

Password: rajankunte@123

Municipal Worker portal:

Email: demo1.rajankunte@municipalcorporation.in

Password: demo@123

admin portal:

Email: admin

Password: password123

✨ Key Features
Civic Issue Reporting: Allows citizens to easily report malfunctioning streetlights, potholes, and other infrastructure hazards with real-time location data.

Circular Waste Economy (SwachhLink): Dedicated workflows to track, incentivize, and manage responsible urban waste disposal.

Cloud Image Handling: Deep integration with Microsoft Azure Blob Storage to seamlessly handle cross-device, asynchronous data streams for photo evidence of civic issues.

Distinct User Workflows: Isolated and secure dashboards tailored specifically for citizens reporting issues, workers assigned to tasks, and admins overseeing municipal operations.

Data Isolation & Concurrency: Robust backend architecture ensuring that concurrent user inputs and reports are processed flawlessly without data overlap or corruption.

🛠️ Tech Stack
Frontend: HTML5, CSS3, Vanilla JavaScript, DOM Manipulation

Backend: Node.js, Express.js

Database: MongoDB (Atlas), Mongoose ORM

Cloud Infrastructure: Microsoft Azure (Blob Storage)

⚙️ Local Installation & Setup
Clone the repository:

Bash


git clone https://github.com/suseelamohith-afk/urbanresolve.git
cd urbanresolve
Install dependencies:

Bash


cd backend
npm install
Set up Environment Variables:
Create a .env file in the backend directory and add your necessary keys:

Code snippet


PORT=10000
MONGO_URI=your_mongodb_connection_string
AZURE_STORAGE_CONNECTION_STRING=your_azure_connection_string
JWT_SECRET=your_secret_key
Run the application:
Return to the root directory and start the server:

Bash


npm start
🛡️ Security & Architecture Notes
This project handles complex asynchronous data streams and file uploads by utilizing Azure Blob Storage rather than saving files to a local disk. This ensures the application remains stateless and scalable when deployed to cloud providers like Render. The backend utilizes strict Mongoose schemas and token-based authentication to maintain absolute data isolation between standard citizens and municipal administrators.
