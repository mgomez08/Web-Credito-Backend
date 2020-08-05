const bcrypt = require("bcryptjs");
const jwt = require("../services/jwt");
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
                      connection.end();
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

function signIn(req, res) {
  const params = req.body;
  const email = params.email.toLowerCase();
  const password = params.password;
  if (!email || !password) {
    res.status(404).send({
      message: "Debe ingresar una correo electrónico y una contraseña.",
    });
  } else {
    const email = params.email.toLowerCase();
    const password = params.password;
    const connection = mysql.createConnection({
      host: HOST,
      user: USER,
      password: PASSWORD,
      database: DATABASE,
      typeCast: function castField(field, useDefaultTypeCasting) {
        if (field.type === "BIT" && field.length === 1) {
          var bytes = field.buffer();
          return bytes[0] === 1;
        }
        return useDefaultTypeCasting();
      },
    });
    connection.connect((err) => {
      if (err) {
        throw err;
      }
    });

    const sql = `SELECT * FROM users WHERE email="${email}"`;
    connection.query(sql, (err, userStored) => {
      if (err) {
        res.status(500).send({
          message: "Ocurrió un error en el servidor, inténtelo más tarde. #5",
        });
      } else {
        if (!userStored) {
          res.status(500).send({
            message: "Usuario no encontrado.",
          });
        } else {
          bcrypt.compare(password, userStored[0].password, (err, check) => {
            if (err) {
              res.status(500).send({
                message:
                  "Ocurrió un error en el servidor, inténtelo más tarde. #6",
              });
            } else if (!check) {
              res.status(404).send({
                message:
                  "El correo electrónico o la contraseña son incorrectos",
              });
            } else if (!userStored[0].active) {
              res.status(200).send({
                message:
                  "El usuario está desactivado, comunicate con atención al cliente.",
              });
            } else {
              res.status(200).send({
                accessToken: jwt.createAccessToken(userStored[0]),
                refreshToken: jwt.createRefreshToken(userStored[0]),
              });
              connection.end();
            }
          });
        }
      }
    });
  }
}
module.exports = {
  signUp,
  signIn,
};
