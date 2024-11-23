import { Router } from "express";
import { loginConsumer, registerConsumer, sendOtpOnPhone, sendOtpOnEmail } from "../controllers/consumer.controller.js";
// import { upload } from "../middlewares/multer.middleware.js"
// import { verifyJWT } from "../middlewares/auth.middleware.js";
import { gstVerification } from "../utils/gstinVerification.js";
import { aadharVerification } from "../utils/digilocker.js";


const router = Router();

router.route("/signup").post(registerConsumer)
router.route("/sendOtp/phone").post(sendOtpOnPhone)
router.route("/sendOtp/email").post(sendOtpOnEmail)
router.route("/verify/gst").post(gstVerification)
router.route("/verify/aadhar").post(aadharVerification)
router.route("/login").get(loginConsumer)
router.route("/sendOtpLogin").get(sendConsumerOtpLogin)

export default router;