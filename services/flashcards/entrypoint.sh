#!/bin/sh
set -e

echo "Ensuring flashcards database exists..."
node <<'NODE'
const mysql = require('mysql');

const host = process.env.MARIA_DB_HOST || 'mariadb';
const port = Number(process.env.MARIA_DB_PORT || 3306);
const user = process.env.MARIA_DB_USERNAME || process.env.DB_USER || 'root';
const password = process.env.MARIA_DB_PASSWORD || process.env.DB_PASSWORD || '';
const database = process.env.MARIA_DB_DATABASE || process.env.DB_NAME;

if (!database) {
  console.error('MARIA_DB_DATABASE/DB_NAME is required');
  process.exit(1);
}

const connection = mysql.createConnection({ host, port, user, password, multipleStatements: false });

connection.connect((connectError) => {
  if (connectError) {
    console.error('Failed to connect to MariaDB', connectError);
    process.exit(1);
  }

  const escapedName = database.replace(/`/g, '``');
  const sql = 'CREATE DATABASE IF NOT EXISTS `' + escapedName + '`';
  connection.query(sql, (queryError) => {
    connection.end();
    if (queryError) {
      console.error('Failed to create database', queryError);
      process.exit(1);
    }
  });
});
NODE

echo "Running database migrations..."
npm run migration:run

echo "Starting flashcards service..."
npm run start:prod
