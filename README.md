# Smart Appointment Booking & Slot Management System

## Problem Statement
Manual appointment booking leads to double bookings, confusion, and poor user experience.
This project provides a conflict-free appointment booking system with user and admin roles.

## Features
- User registration and login
- Admin dashboard to create appointment slots
- View available slots in real time
- Conflict-free booking (no double booking)
- User booking history
- Admin view of all bookings
- Logout functionality

## Tech Stack
Frontend:
- HTML
- CSS
- JavaScript

Backend:
- Node.js
- Express.js

Database:
- SQLite

## How It Works
- Admin creates appointment slots
- Users view available slots
- Each slot can be booked only once
- Database constraints prevent double booking

## Project Structure
appointment-system/
├── frontend/
├── backend/
├── README.md

## How to Run Locally
1. Install Node.js
2. Navigate to backend folder
3. Run:
```bash
npm install
node server.js