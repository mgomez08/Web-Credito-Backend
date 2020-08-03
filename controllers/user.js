const bcrypt = require("bcryptjs");
const mysql = require("mysql");
const { HOST, USER, PASSWORD, DATABASE } = require("../config");

function signUp(req, res) {
  const userObj = {
    type_doc: req.body.typedoc,
    num_doc: req.body.ndoc,
    name: req.body.names,
    lastname: req.body.lastname,
    email: req.body.email.toLowerCase(),
    tel: req.body.tel,
    role: "user",
    active: 1,
    password: req.body.password,
  };
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
  const sql = `SELECT COUNT(*) AS docscount FROM users WHERE type_doc="${userObj.type_doc}" AND num_doc=${userObj.num_doc}`;
  connection.query(sql, (err, docsrepeat) => {
    if (err) {
      res.status(500).send({
        message: "Ocurrió un error en el servidor, inténtelo más tarde. #1",
      });
    } else if (docsrepeat[0].docscount > 0) {
      res.status(404).send({
        message:
          "Este número de identificación ya está registrado, si crees que es un error comunicate con atención al cliente.",
      });
    } else {
      const sql = `SELECT COUNT(*) AS emailscount FROM users WHERE email="${userObj.email}"`;
      connection.query(sql, (err, emailsrepeat) => {
        if (err) {
          res.status(500).send({
            message: "Ocurrió un error en el servidor, inténtelo más tarde. #2",
          });
        } else if (emailsrepeat[0].emailscount > 0) {
          res.status(404).send({
            message: "Este correo electrónico ya está registrado",
          });
        } else {
          if (!userObj.password || !req.body.passwordRepeat) {
            res
              .status(404)
              .send({ message: "Las contraseñas son obligatorias." });
          } else {
            if (userObj.password !== req.body.passwordRepeat) {
              res
                .status(404)
                .send({ message: "Las contraseñas no son iguales" });
            } else {
              bcrypt.hash(userObj.password, 10, function (err, hash) {
                if (err) {
                  res.status(500).send({
                    message:
                      "Ocurrió un error en el servidor, inténtelo más tarde. #3",
                  });
                } else {
                  userObj.password = hash;
                  const sql = "INSERT INTO users SET ?";
                  connection.query(sql, userObj, (err) => {
                    if (err) {
                      res.status(500).send({
                        message:
                          "Ocurrió un error en el servidor, inténtelo más tarde. #4",
                      });
                    } else {
                      res.status(200).send({ user: userObj });
                    }
                  });
                }
              });
            }
          }
        }
      });
    }
  });
}

module.exports = {
  signUp,
};
