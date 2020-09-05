const jwt = require("jwt-simple");
const moment = require("moment");

const SECRET_KEY =
  "12EWDADF3dfe3d3f#asdawdwSDF235C54S43464GJYJvs1352JcAsfJadjajeEsdascfQEDSEArrdvsdvvs";

exports.ensureAuth = (req, res, next) => {
  if (!req.headers.authorization) {
    return res
      .status(403)
      .send({ message: "La petición no tiene cabecera de Autentificación." });
  }
  const token = req.headers.authorization.replace(/['"]+/g, "");
  try {
    var payload = jwt.decode(token, SECRET_KEY);
    if (payload.exp <= moment.unix()) {
      return res.status(404).send({ message: "El token ha expirado" });
    }
  } catch (ex) {
    return res.status(404).send({ message: "Token invalido." });
  }
  req.user = payload;
  next();
};
