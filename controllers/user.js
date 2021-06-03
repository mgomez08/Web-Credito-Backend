const bcrypt = require("bcryptjs");
const jwt = require("../services/jwt");
const mysql = require("mysql");
const moment = require("moment");
const { HOST, USER, PASSWORD, DATABASE } = require("../config");
const { convertCredit, convertAssets } = require("../utils/convertValues");

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
      connection.end();
      res.status(500).send({
        message: "Ocurrió un error en el servidor, inténtelo más tarde. #1",
      });
    } else if (docsrepeat[0].docscount > 0) {
      connection.end();
      res.status(404).send({
        message:
          "Este número de identificación ya está registrado, si crees que es un error comunicate con atención al cliente.",
      });
    } else {
      const sql = `SELECT COUNT(*) AS emailscount FROM users WHERE email="${userObj.email}"`;
      connection.query(sql, (err, emailsrepeat) => {
        if (err) {
          connection.end();
          res.status(500).send({
            message: "Ocurrió un error en el servidor, inténtelo más tarde. #2",
          });
        } else if (emailsrepeat[0].emailscount > 0) {
          connection.end();
          res.status(404).send({
            message: "Este correo electrónico ya está registrado",
          });
        } else {
          if (!userObj.password || !req.body.passwordRepeat) {
            connection.end();
            res
              .status(404)
              .send({ message: "Las contraseñas son obligatorias." });
          } else {
            if (userObj.password !== req.body.passwordRepeat) {
              connection.end();
              res
                .status(404)
                .send({ message: "Las contraseñas no son iguales" });
            } else {
              bcrypt.hash(userObj.password, 10, function (err, hash) {
                if (err) {
                  connection.end();
                  res.status(500).send({
                    message:
                      "Ocurrió un error en el servidor, inténtelo más tarde. #3",
                  });
                } else {
                  userObj.password = hash;
                  const sql = "INSERT INTO users SET ?";
                  connection.query(sql, userObj, (err) => {
                    if (err) {
                      connection.end();
                      res.status(500).send({
                        message:
                          "Ocurrió un error en el servidor, inténtelo más tarde. #4",
                      });
                    } else {
                      const sql = `SELECT id FROM users WHERE type_doc="${userObj.type_doc}" AND num_doc=${userObj.num_doc}`;
                      connection.query(sql, (err, userId) => {
                        if (err) {
                          connection.end();
                          res.status(500).send({
                            message:
                              "Ocurrió un error en el servidor, inténtelo más tarde. #4.2",
                          });
                        } else if (!userId) {
                          connection.end();
                          res.status(404).send({
                            message: "No se encontró un ID para el usuario.",
                          });
                        } else {
                          const sql = `INSERT INTO financial_info (id_user) VALUES(${userId[0].id})`;
                          connection.query(sql, (err) => {
                            if (err) {
                              connection.end();
                              res.status(500).send({
                                message:
                                  "Ocurrió un error en el servidor, inténtelo más tarde. #4.3",
                              });
                            } else {
                              connection.end();
                              res.status(200).send({ user: userObj });
                            }
                          });
                        }
                      });
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
        connection.end();
        res.status(500).send({
          message: "Ocurrió un error en el servidor, inténtelo más tarde. #5",
        });
      } else {
        if (!userStored[0]) {
          connection.end();
          res.status(404).send({
            message: "Usuario no encontrado.",
          });
        } else {
          bcrypt.compare(password, userStored[0].password, (err, check) => {
            if (err) {
              connection.end();
              res.status(500).send({
                message:
                  "Ocurrió un error en el servidor, inténtelo más tarde. #6",
              });
            } else if (!check) {
              connection.end();
              res.status(404).send({
                message:
                  "El correo electrónico o la contraseña son incorrectos",
              });
            } else if (!userStored[0].active) {
              connection.end();
              res.status(404).send({
                message:
                  "El usuario está desactivado, comunicate con atención al cliente.",
              });
            } else {
              connection.end();
              res.status(200).send({
                accessToken: jwt.createAccessToken(userStored[0]),
                refreshToken: jwt.createRefreshToken(userStored[0]),
              });
            }
          });
        }
      }
    });
  }
}
function changePassword(req, res) {
  const currentPassword = req.body.currentPassword;
  const newPassword = req.body.newPassword;
  const repeatPassword = req.body.repeatPassword;
  if (!currentPassword || !newPassword || !repeatPassword) {
    res.status(404).send({
      message: "Debe llenar todos los campos.",
    });
  } else if (newPassword !== repeatPassword) {
    res.status(404).send({
      message: "Las contraseñas nuevas son diferentes.",
    });
  } else {
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
    const sql = `SELECT password FROM users WHERE id="${req.user.id}"`;
    connection.query(sql, (err, userStored) => {
      if (err) {
        connection.end();
        res.status(500).send({
          message: "Ocurrió un error en el servidor, inténtelo más tarde.",
        });
      } else {
        if (!userStored[0]) {
          connection.end();
          res.status(404).send({
            message: "Ocurrió un error, inténtelo más tarde.",
          });
        } else {
          bcrypt.compare(
            currentPassword,
            userStored[0].password,
            (err, check) => {
              if (err) {
                connection.end();
                res.status(500).send({
                  message:
                    "Ocurrió un error en el servidor, inténtelo más tarde.",
                });
              } else if (!check) {
                connection.end();
                res.status(404).send({
                  message: "La contraseña actual no es correcta.",
                });
              } else {
                bcrypt.hash(newPassword, 10, function (err, hash) {
                  if (err) {
                    connection.end();
                    res.status(500).send({
                      message: "Ocurrió un error, inténtelo más tarde.",
                    });
                  } else {
                    hash;
                    const sql = `UPDATE users SET password="${hash}" WHERE id="${req.user.id}"`;
                    connection.query(sql, (err) => {
                      if (err) {
                        connection.end();
                        res.status(500).send({
                          message:
                            "Ocurrió un error en el servidor, inténtelo más tarde.",
                        });
                      } else {
                        connection.end();
                        res.status(200).send({
                          ok: true,
                          message: "Contraseña cambiada correctamente.",
                        });
                      }
                    });
                  }
                });
              }
            }
          );
        }
      }
    });
  }
}
function savePersonalInfo(req, res) {
  const userObj = {
    name: req.body.names,
    lastname: req.body.lastname,
    date_birth: moment(req.body.datebirth).format("YYYY-MM-DD"),
    depart_birth: req.body.departbirth,
    city_birth: req.body.citybirth,
    type_doc: req.body.typedoc,
    num_doc: req.body.ndoc,
    tel: req.body.tel,
    age: req.body.age,
    marital_status: req.body.maritalstatus,
    edu_level: req.body.educationallevel,
    profession: req.body.profession,
    occupation: req.body.occupation,
    num_per_family_ncl: req.body.numpersonsfamilynucleus,
    num_per_depen: req.body.numpersonsdependents,
    type_housing: req.body.typehousing,
    depart_resi: req.body.departresidence,
    city_resi: req.body.cityresidence,
    home_address: req.body.homeaddress,
    years_resi: req.body.yearsresidence,
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
  const sql = `UPDATE users SET ? WHERE type_doc="${userObj.type_doc}" AND num_doc=${userObj.num_doc}`;
  connection.query(sql, userObj, (err) => {
    if (err) {
      console.log(err);
      connection.end();
      res.status(500).send({
        message: "Ocurrió un error en el servidor, inténtelo más tarde. #7",
      });
    } else {
      connection.end();
      res.status(200).send();
    }
  });
}
function getPersonalInfo(req, res) {
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
  const sql = `SELECT name AS names, lastname, date_birth AS datebirth, depart_birth AS departbirth, city_birth AS citybirth,	type_doc AS typedoc, num_doc AS ndoc, tel, age, marital_status AS maritalstatus, edu_level AS educationallevel, profession, occupation, num_per_family_ncl AS numpersonsfamilynucleus, num_per_depen AS numpersonsdependents, type_housing AS typehousing, depart_resi AS departresidence, 	city_resi AS cityresidence, home_address AS homeaddress, years_resi AS yearsresidence FROM users WHERE id="${req.user.id}"`;
  connection.query(sql, (err, userStored) => {
    if (err) {
      connection.end();
      res.status(500).send({
        message: "Ocurrió un error en el servidor, inténtelo más tarde. #8",
      });
    } else if (!userStored[0]) {
      connection.end();
      res.status(404).send({
        message: "No se encontró el usuario.",
      });
    } else if (userStored[0].datebirth !== "0000-00-00") {
      const yearsDate = moment().diff(userStored[0].datebirth, "years", false);
      if (yearsDate !== userStored[0].age) {
        const sql = `UPDATE users SET age = ${yearsDate} WHERE type_doc="${userStored[0].typedoc}" AND num_doc=${userStored[0].ndoc}`;
        connection.query(sql, (err) => {
          if (err) {
            connection.end();
            res.status(500).send({
              message: "Ocurrió un error en el servidor, inténtelo más tarde.",
            });
          } else {
            userStored[0].age = yearsDate;
          }
        });
      }
    }
    if (userStored[0].datebirth === "0000-00-00") {
      userStored[0].datebirth = null;
    }
    connection.end();
    res.status(200).send({ userStored });
    return userStored;
  });
}

function saveFinancialInfo(req, res) {
  const userObj = {
    years_experience: req.body.yearsexperience,
    date_current_job: moment(req.body.datecurrentjob).format("YYYY-MM-DD"),
    work_position: req.body.workposition,
    type_salary: req.body.typesalary,
    type_contract: req.body.typecontract,
    total_assets: req.body.totalassets,
    monthly_salary: req.body.monthlysalary,
    additional_income: req.body.additionalincome,
    total_monthly_income: req.body.totalmonthlyincome,
    monthly_expenditure: req.body.monthlyexpenditure,
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
  const sql = `UPDATE financial_info SET ? WHERE id_user ="${req.user.id}"`;
  connection.query(sql, userObj, (err) => {
    if (err) {
      connection.end();
      res.status(500).send({
        message: "Ocurrió un error en el servidor, inténtelo más tarde. #9",
      });
    } else {
      connection.end();
      res.status(200).send();
    }
  });
}

function getFinancialInfo(req, res) {
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
  const sql = `SELECT years_experience AS yearsexperience, date_current_job AS datecurrentjob, work_position AS workposition, type_salary AS typesalary, type_contract AS typecontract, total_assets AS totalassets, monthly_salary AS monthlysalary, additional_income AS additionalincome, total_monthly_income AS totalmonthlyincome, monthly_expenditure AS  monthlyexpenditure FROM financial_info WHERE id_user="${req.user.id}"`;
  connection.query(sql, (err, userStored) => {
    if (err) {
      connection.end();
      res.status(500).send({
        message: "Ocurrió un error en el servidor, inténtelo más tarde. #10",
      });
    } else if (!userStored[0]) {
      connection.end();
      res.status(404).send({
        message: "No se encontró el usuario.",
      });
    } else if (userStored[0].datecurrentjob !== "0000-00-00") {
      const yearsDate = moment().diff(
        userStored[0].datecurrentjob,
        "years",
        false
      );
      if (yearsDate !== userStored[0].yearsexperience) {
        const sql = `UPDATE financial_info SET years_experience = ${yearsDate} WHERE id_user="${req.user.id}"`;
        connection.query(sql, (err) => {
          if (err) {
            connection.end();
            res.status(500).send({
              message: "Ocurrió un error en el servidor, inténtelo más tarde.",
            });
          } else {
            userStored[0].yearsexperience = yearsDate;
          }
        });
      }
    }
    if (userStored[0].datecurrentjob === "0000-00-00") {
      userStored[0].datecurrentjob = null;
    }
    connection.end();
    res.status(200).send({ userStored });
  });
}

function getColumnsNulls(req, res) {
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
  const sql = `SELECT((SELECT SUM((date_birth ='0000-00-00') + (depart_birth = '') + (city_birth = '') + (age IS NULL) + (marital_status = '') + (edu_level = '') + (profession = '') + (occupation = '') +(num_per_family_ncl IS NULL)  + (num_per_depen IS NULL)  + (type_housing = '') + (depart_resi = '') + (city_resi = '') + (home_address = '') + (years_resi IS NULL)) from users WHERE id='${req.user.id}')+(SELECT IFNULL(SUM((years_experience IS NULL) + (date_current_job ='0000-00-00') +  + (work_position = '') + (type_salary = "") + (type_contract = '') + (total_assets IS NULL) + (monthly_salary IS NULL) + (additional_income IS NULL) + (total_monthly_income IS NULL) +  (monthly_expenditure IS NULL)),7) from financial_info WHERE id_user='${req.user.id}')) AS value`;
  connection.query(sql, (err, columnsNulls) => {
    if (err) {
      connection.end();
      res.status(500).send({
        message: "Ocurrió un error en el servidor, inténtelo más tarde. #11",
      });
    } else if (!columnsNulls) {
      connection.end();
      res.status(404).send({
        message: "No se pudo obtener el número de columnas vacías.",
      });
    } else {
      connection.end();
      res.status(200).send({ columnsNulls });
    }
  });
}
function saveFormProgress(req, res) {
  const progress = req.body.progress;
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
  const sql = `UPDATE users SET form_progress=${progress} WHERE id=${req.user.id}`;
  connection.query(sql, (err) => {
    if (err) {
      connection.end();
      res.status(500).send({
        message: "Ocurrió un error en el servidor, inténtelo más tarde. #12",
      });
    } else {
      connection.end();
      res.status(200).send({ message: "Ok" });
    }
  });
}
function getFormProgress(req, res) {
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
  const sql = `SELECT form_progress FROM users WHERE id=${req.user.id}`;
  connection.query(sql, (err, resultProgress) => {
    if (err) {
      connection.end();
      res.status(500).send({
        message: "Ocurrió un error en el servidor, inténtelo más tarde. #13",
      });
    } else if (!resultProgress[0]) {
      connection.end();
      res.status(404).send({
        message: "No se encontró el usuario.",
      });
    } else {
      connection.end();
      res.status(200).send({ progress: resultProgress[0].form_progress });
    }
  });
}
function saveScoringInfo(req, res) {
  const have_credits = req.body.havecredits;
  const amount_credit_acquired = req.body.amountcreditacquired;
  const days_past_due = req.body.dayspastdue;

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
  const sql = `UPDATE financial_info SET have_credits="${have_credits}", amount_credit_acquired=${amount_credit_acquired}, days_past_due=${days_past_due} WHERE id_user ="${req.user.id}"`;
  connection.query(sql, (err) => {
    if (err) {
      console.log(err);
      connection.end();
      res.status(500).send({
        message: "Ocurrió un error en el servidor, inténtelo más tarde. #9",
      });
    } else {
      connection.end();
      res.status(200).send();
    }
  });
}
function getScoringInfo(req, res) {
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
  const sql = `SELECT have_credits AS havecredits, amount_credit_acquired AS amountcreditacquired, days_past_due AS dayspastdue FROM financial_info WHERE id_user ="${req.user.id}"`;
  connection.query(sql, (err, userStored) => {
    if (err) {
      connection.end();
      console.log(err);
      res.status(500).send({
        message: "Ocurrió un error en el servidor, inténtelo más tarde. #8",
      });
    } else {
      connection.end();
      res.status(200).send({ scoringData: userStored[0] });
    }
  });
}

function calculatedScoring(req, res) {
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
  const sql = `SELECT age FROM users WHERE id="${req.user.id}"`;
  connection.query(sql, (err, personalData) => {
    if (err) {
      connection.end();
      res.status(500).send({
        message: "Ocurrió un error en el servidor, inténtelo más tarde. #8",
      });
    } else if (!personalData[0]) {
      connection.end();
      res.status(404).send({
        message: "No se encontró el usuario.",
      });
    } else {
      const sql = `SELECT years_experience AS yearsexperience, total_assets AS totalassets, have_credits AS havecredits, amount_credit_acquired AS amountcreditacquired, days_past_due AS dayspastdue FROM financial_info WHERE id_user="${req.user.id}"`;
      connection.query(sql, (err, financialData) => {
        if (err) {
          connection.end();
          res.status(500).send({
            message:
              "Ocurrió un error en el servidor, inténtelo más tarde. #10",
          });
        } else if (!financialData[0]) {
          connection.end();
          res.status(404).send({
            message: "No se encontró el usuario.",
          });
        } else {
          personalData = personalData[0];
          financialData = financialData[0];

          let indebtedness;

          if (financialData.havecredits === "No") {
            indebtedness = 0;
          } else if (financialData.havecredits === "Si") {
            indebtedness =
              convertCredit(financialData.amountcreditacquired) /
              convertAssets(financialData.totalassets);
            indebtedness > 1 ? (indebtedness = 1) : indebtedness;
          }

          console.log(indebtedness);
          const scoring = personalData.age * financialData.amountcreditacquired;

          const sql = `UPDATE users SET scoring = ${scoring} WHERE id="${req.user.id}"`;
          connection.query(sql, (err) => {
            if (err) {
              connection.end();
              res.status(500).send({
                message:
                  "Ocurrió un error en el servidor, inténtelo más tarde.",
              });
            } else {
              connection.end();
              res.status(200).send({
                scoring,
              });
            }
          });
        }
      });
    }
  });
}
function getScoring(req, res) {
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
  const sql = `SELECT scoring from users WHERE id=${req.user.id}`;
  connection.query(sql, (err, resultScoring) => {
    if (err) {
      connection.end();
      res.status(500).send({
        message: "Ocurrió un error en el servidor, inténtelo más tarde.",
      });
    } else {
      connection.end();
      res.status(200).send({ scoring: resultScoring[0].scoring });
    }
  });
}
module.exports = {
  signUp,
  signIn,
  changePassword,
  savePersonalInfo,
  getPersonalInfo,
  saveFinancialInfo,
  getFinancialInfo,
  getColumnsNulls,
  saveFormProgress,
  getFormProgress,
  saveScoringInfo,
  getScoringInfo,
  calculatedScoring,
  getScoring,
};
