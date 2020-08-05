const jwt = require("jwt-simple");
const moment = require("moment");

const SECRET_KEY =
  "12EWDADF3dfe3d3f#asdawdwSDF235C54S43464GJYJvs1352JcAsfJadjajeEsdascfQEDSEArrdvsdvvs";

exports.createAccessToken = function (user) {
  const payload = {
    id: user.id,
    type_doc: user.type_doc,
    num_doc: user.num_doc,
    name: user.name,
    lastname: user.lastname,
    email: user.email,
    tel: user.tel,
    role: user.role,
    active: user.active,
    createToken: moment().unix(),

    exp: moment().add(3, "hours").unix(),
  };
  return jwt.encode(payload, SECRET_KEY);
};

exports.createRefreshToken = function (user) {
  const payload = {
    id: user.id,
    exp: moment().add(30, "days").unix(),
  };
  return jwt.encode(payload, SECRET_KEY);
};

exports.decodeToken = function (token) {
  return jwt.decode(token, SECRET_KEY, true);
};
