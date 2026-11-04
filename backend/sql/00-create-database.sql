-- Run this script in MySQL Workbench using a MySQL administrator account.
-- It creates the StudyFlow database only. It does not drop or alter existing data.
-- Create the application user separately using the instructions in README.md.

CREATE DATABASE IF NOT EXISTS studyflow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
