import { Router } from "express";

import {
  changeCurrentPassword,
  loginUser,
  logoutUser,
  refreshAccessToken,
  register, updateAccountDetails,
} from "../controllers/user.controller.js";

import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
  upload.fields([
    {name:"profilePicture",maxCount:1},
    {name:"coverPhoto",maxCount:1}
  ]),
  register)
router.route("/login").post(loginUser)


//secured routes
router.route("/logout").post(verifyJWT,  logoutUser)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)
router.route("/refresh-token").post(refreshAccessToken)

export default router