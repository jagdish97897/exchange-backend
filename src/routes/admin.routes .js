import { Router } from "express";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWTAdmin } from "../middlewares/auth.middleware.js";
import { changeUserPasswordByAdmin, deleteUserByAdmin, logoutUserByAdmin, registerAdmin, updateUserAccountDetailsByAdmin, updateUserprofileImageByAdmin, viewUserDetails } from "../controllers/admin.controller.js";


const router = Router()

router.route("/register-admin").post(
    upload.fields([
        {
            name: "profileImage",
            maxCount: 1
        }, 
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerAdmin
    )
    
router.route("/update-useraccountby-admin").patch(verifyJWTAdmin, updateUserAccountDetailsByAdmin)
router.route("/update-UserProfileImageBy-admin").patch(verifyJWTAdmin, upload.single("profileImage"), updateUserprofileImageByAdmin)
router.route("/delete-useraccountby-admin").delete(verifyJWTAdmin, deleteUserByAdmin)
router.route("/change-userpasswordby-admin").post(verifyJWTAdmin, changeUserPasswordByAdmin)
router.route("/logout-userby-admin").post(verifyJWTAdmin,  logoutUserByAdmin)
router.route("/view-userdetailby-admin").get(verifyJWTAdmin, viewUserDetails)

export default router