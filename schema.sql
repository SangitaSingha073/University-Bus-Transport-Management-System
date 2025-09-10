
-- Create the database if it does not exist
CREATE DATABASE IF NOT EXISTS bus_management ;
USE bus_management ;

-- --------------------------------------------------------
-- Table structure for `users`
-- Stores user login information
-- --------------------------------------------------------
CREATE TABLE users(
  id INT NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'driver', 'admin') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table structure for `students`
-- Stores information specific to students
-- --------------------------------------------------------
CREATE TABLE students (
  student_id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  contact_info VARCHAR(255),
  bus_id INT,
  PRIMARY KEY (student_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table structure for `staff`
-- A general table for staff members
-- --------------------------------------------------------
CREATE TABLE staff (
  staff_id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  contact_info VARCHAR(255),
  PRIMARY KEY (staff_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table structure for `buses`
-- Stores information about each bus
-- --------------------------------------------------------
CREATE TABLE buses (
  bus_id INT NOT NULL AUTO_INCREMENT,
  bus_number VARCHAR(50) NOT NULL UNIQUE,
  capacity INT,
  driver_id INT,
  route_id INT,
  PRIMARY KEY (bus_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table structure for `routes`
-- Stores bus route details
-- --------------------------------------------------------
CREATE TABLE routes (
  route_id INT NOT NULL AUTO_INCREMENT,
  route_name VARCHAR(255) NOT NULL,
  route_details TEXT,
  PRIMARY KEY (route_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Sample Data Insertion
-- --------------------------------------------------------

-- Insert sample users (passwords are 'password' for all for simplicity, but in a real app, they should be hashed)
INSERT INTO users (email, password_hash, role) VALUES
('singhasangita073@gmail.com', 'sangi', 'student'),
('itssangita073@gmail.com','sangita','student'),
('admin@example.com', 'adminpassword', 'admin'),
('poltu@gmail.com', 'poltu', 'driver');

-- Insert sample routes
INSERT INTO routes (route_name, route_details) VALUES
('Route 1 - West campus', 'Stops at City Hall, Central Park, and the Library.'),
('Route 2 - East campus', 'Stops at North Gate, Faculty Housing, and the Sports Complex.');

-- Insert sample drivers and teachers into staff table
INSERT INTO staff (user_id, name, contact_info) VALUES
(5, 'Poltu Maity', '555-123-4567'),
(14, 'Laltu Pal', '555-987-6543');

-- Insert sample buses
INSERT INTO buses (bus_number, capacity, driver_id, route_id) VALUES
('BUS-101', 50, 1, 1),
('BUS-201', 50, 2, 2);

-- Insert a sample student and assign them to a bus
INSERT INTO students (user_id, name, contact_info, bus_id) VALUES
(1, 'Sangita Singha', 'singhasangita073@gmail.com', 1);

-- --------------------------------------------------------
-- Add foreign key constraints after table creation to avoid circular dependencies
-- --------------------------------------------------------
ALTER TABLE students ADD CONSTRAINT fk_students_buses FOREIGN KEY (bus_id) REFERENCES buses(bus_id);
ALTER TABLE buses ADD CONSTRAINT fk_buses_drivers FOREIGN KEY (driver_id) REFERENCES staff(staff_id);
ALTER TABLE buses ADD CONSTRAINT fk_buses_routes FOREIGN KEY (route_id) REFERENCES routes(route_id);
