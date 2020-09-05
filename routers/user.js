const express = require("express");
const UserController = require("../controllers/user");
const md_auth = require("../middleware/authenticated");

const api = express.Router();

api.post("/sign-up", UserController.signUp);
api.post("/sign-in", UserController.signIn);
api.post(
  "/save-personal-info",
  [md_auth.ensureAuth],
  UserController.savePersonalInfo
);
api.post(
  "/save-financial-info",
  [md_auth.ensureAuth],
  UserController.saveFinancialInfo
);
api.get(
  "/get-personal-info",
  [md_auth.ensureAuth],
  UserController.getPersonalInfo
);
api.get(
  "/get-financial-info",
  [md_auth.ensureAuth],
  UserController.getFinancialInfo
);
api.get(
  "/get-columns-nulls",
  [md_auth.ensureAuth],
  UserController.getColumnsNulls
);

module.exports = api;
