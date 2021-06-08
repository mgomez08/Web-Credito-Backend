require("dotenv").config();

const API_VERSION = process.env.API_VERSION;
const HOST = process.env.HOST;
const USER = process.env.USER;
const PASSWORD = process.env.PASSWORD;
const DATABASE = process.env.DATABASE;
const PORT_DB = process.env.PORT_DB;
module.exports = {
  API_VERSION,
  HOST,
  USER,
  PASSWORD,
  DATABASE,
  PORT_DB,
};
