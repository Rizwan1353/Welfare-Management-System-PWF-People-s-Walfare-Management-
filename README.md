# Welfare Management System – PWF

A full-stack Welfare Management System developed for **People's Welfare Foundation (PWF)** to digitize and simplify welfare organization operations.

## About the Project

The Welfare Management System is designed to manage organizational activities through a centralized web application. It provides administrative tools for managing welfare projects, districts, donations, volunteers, organizational reports and official documents.

The system includes role-based access control, session-based authentication, donation verification, PDF document generation and Excel reporting.

## Features

- Secure staff login and session management
- Role-based access control
- Interactive administrative dashboard
- District management (CRUD operations)
- Welfare project management
- Donation submission and manual verification
- Volunteer application management
- PDF report generation
- Excel report export
- Offer letter and certificate generation
- Organizational audit logs
- Profile management
- Organization logo management

## Technology Stack

**Frontend**
- HTML5
- Tailwind CSS
- JavaScript

**Backend**
- Node.js
- Express.js

**Data Storage**
- JSON File-Based Storage

**Additional Libraries**
- Express Session
- PDFKit
- ExcelJS
- Multer

## Project Structure

```text
welfare-management-system/
│
├── config/
├── data/
├── lib/
├── middleware/
├── routes/
├── scripts/
├── services/
├── storage/
├── views/
│   ├── css/
│   ├── js/
│   └── assets/
│
├── server.js
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Installation

1. Clone the repository:

```bash
git clone YOUR_REPOSITORY_URL
```https://github.com/Rizwan1353/Welfare-Management-System-PWF-People-s-Walfare-Management-

2. Navigate into the project:

```bash
cd welfare-management-system
```

3. Install dependencies:

```bash
npm install
```

4. Configure your environment variables if required.

5. Start the application:

```bash
npm start
```

6. Open your browser:

```text
http://localhost:3000
```

## Important Notes

- The application currently uses JSON files for data storage instead of MongoDB.
- Donations are verified manually; no payment gateway is integrated.
- Volunteer applications redirect to an external Google Form.
- Configure your organization's actual payment details and volunteer form before deployment.
- Replace default demonstration credentials before production use.

## Future Improvements

- MongoDB database integration
- React-based frontend
- Online payment gateway integration
- Advanced analytics and reporting
- Cloud-based document storage

## License

ISC License