const jwt = require("../services/jwt");
const mysql = require("mysql");
const { HOST, USER, PASSWORD, DATABASE } = require("../config");
const moment = require("moment");

function WillExpiredToken(token) {
  const { exp } = jwt.decodeToken(token);
  const currentDate = moment().unix();
  if (currentDate > exp) {
    return true;
  } else {
    return false;
  }
}

function refreshAccessToken(req, res) {
  const { refreshToken } = req.body;
  const isTokenExpired = WillExpiredToken(refreshToken);
  if (isTokenExpired) {
    res.status(404).send({ message: "El refreshToken ha expirado" });
  } else {
    const { id } = jwt.decodeToken(refreshToken);
    const connection = mysql.createConnection({
      host: HOST,
      user: USER,
      password: PASSWORD,
      database: DATABASE,
    });
    connection.connect((err) => {
      if (err) {
        throw err;
      }
    });
    const sql = `SELECT * FROM users WHERE id="${id}"`;
    connection.query(sql, (err, userStored) => {
      if (err) {
        res.status(500).send({
          message: "Error en el servidor, inténtelo más tarde. #100",
        });
      } else if (!userStored) {
        res.status(404).send({ message: "Usuario no encontrado." });
      } else {
        res.status(200).send({
          accessToken: jwt.createAccessToken(userStored[0]),
          refreshToken: refreshToken,
        });
      }
    });
  }
}

module.exports = {
  refreshAccessToken,
};
