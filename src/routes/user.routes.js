import { Router } from "express";
import { register, sendOtpOnPhone, sendOtpOnEmail, uploadToS3, sendLoginOtp, getUserByPhoneNumber, updateUserByPhoneNumber  } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
// import { verifyJWT } from "../middlewares/auth.middleware.js";
import { gstVerification } from "../utils/gstinVerification.js";
import { aadharVerification } from "../utils/digilocker.js";

const router = Router();

router.route("/signup").post(register)
router.route("/sendOtp/phone").post(sendOtpOnPhone)
router.route("/sendOtp/email").post(sendOtpOnEmail)
router.route("/verify/gst").post(gstVerification)
router.route("/verify/aadhar").post(aadharVerification)
// router.route("/login").get(loginConsumer);
router.route("/upload").post(upload.array('files', 5), uploadToS3);

router.route("/sendOtp").post(sendLoginOtp)
router.get('/user/:phoneNumber', getUserByPhoneNumber);
router.put('/updateuser', updateUserByPhoneNumber);



export default router;