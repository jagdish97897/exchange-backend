import { Router } from "express";
import { register, sendOtpOnPhone, sendOtpOnEmail, uploadImages, sendLoginOtp, getUserByPhoneNumber, addBroker, getUserById, updateUserByPhoneNumber, verifyLoginOtp, updateUserLocation, updateUserLocation1, updateStatus, savePushToken } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
// import { verifyJWT } from "../middlewares/auth.middleware.js";
import { gstVerification } from "../../utils/gstinVerification.js";
import { aadharVerification } from "../../utils/digilocker.js";

const router = Router();

router.route("/signup").post(register)
router.route("/sendOtp/phone").post(sendOtpOnPhone)
router.route("/sendOtp/email").post(sendOtpOnEmail)
router.route("/verify/gst").post(gstVerification)
router.route("/verify/aadhar").post(aadharVerification)
// router.route("/login").get(loginConsumer);
router.route("/upload").post(upload.array('files', 5), uploadImages);

router.route("/sendOtp").post(sendLoginOtp);
router.get('/:phoneNumber', getUserByPhoneNumber);
router.get('/userid/:id', getUserById);
// router.put('/updateuser/:phoneNumber', updateUserByPhoneNumber);
router.put('/updateuser/:phoneNumber', updateUserByPhoneNumber);

router.route("/verifyOtp").post(verifyLoginOtp);
router.route("/location").put(updateUserLocation);
router.route("/addBroker").post(addBroker);
router.put('/update-location/:userId', updateUserLocation1);
router.put("/update-status/:userId", updateStatus);
router.patch("/save-push-token", savePushToken);

export default router;