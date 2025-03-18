import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import axios from "axios";
import otpGenerator from 'otp-generator';
import { subject } from '../constants.js';
import { sendEmail } from '../utils/sendEmail.js';
import { aadharVerification, panVerification } from "../../utils/digilocker.js";
import { gstVerification } from "../../utils/gstinVerification.js";
import { drivingLicenceVerification } from "../../utils/drivingLicenceVerification.js";
// import { s3 } from '../utils/sesConfig.js';
import jwt from 'jsonwebtoken';
import AWS from 'aws-sdk';
import multer from 'multer';
import { Vehicle } from "../models/vehicle.model.js";
import { getCellId } from "../../utils/location.js";

import { sendEmailNotification } from "../../utils/notification.js";

const kyc = asyncHandler(async (req, res) => {

    Object.keys(req.body).forEach(key => {
        if (req.body[key]) {
            req.body[key] = req.body[key].trim();
        }
    });

    const { fullName, phoneNumber, pin, confirmPin, aadhar, pan, address, dlno, dob, gender, email } = req.body;

    if ([fullName, phoneNumber, pin, confirmPin, aadhar, pan, dlno, dob, gender, email].some(field => !field)) {
        throw new ApiError(400, "All fields are required");
    }

    const existingUser = await Visitor.findOne({
        $or: [
            { phoneNumber },
            { aadhar },
            { pan },
            { dlno },
            { email }
        ]
    });

    if (existingUser) {
        let message = "User already exists";

        if (existingUser.phoneNumber === phoneNumber) {
            message = "Phone number already exists";
        } else if (existingUser.aadhar === aadhar) {
            message = "Aadhar number already exists";
        } else if (existingUser.pan === pan) {
            message = "PAN number already exists";
        } else if (existingUser.dlno === dlno) {
            message = "Driving license number already exists";
        } else if (existingUser.email === email) {
            message = "Email already exists";
        }

        return res.status(400).json({ status: "failed", msg: message });
    }

    if (pin !== confirmPin) {
        return res.status(400).json({ status: "failed", msg: "Pin and confirm pin mismatch" });
    }

    let referrer = '';

    try {

        const options1 = {
            method: 'POST',
            url: 'https://pureprakruti.com/api/kyc/verify/aadhar',
            headers: {
                'Content-Type': 'application/json',
            },
            data: { uid: aadhar, name: fullName, dob, gender, mobile: phoneNumber }
        }

        const aadharResponse = await axios.request(options1);

        if (!aadharResponse) {
            throw new ApiError('Aadhar verification failed');
        }

        if (aadharResponse && aadharResponse.data.response.code && aadharResponse.data.response.code_verifier) {

            const options2 = {
                method: 'POST',
                url: 'https://pureprakruti.com/api/kyc/verify/pan',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: { panno: pan, PANFullName: fullName, code: aadharResponse.data.response.code, code_verifier: aadharResponse.data.response.code_verifier }
            }

            const panVerificationResponse = await axios.request(options2);

            if (!panVerificationResponse) {
                throw new ApiError('PAN verification failed');
            }
        }


        // Hash the pin
        const hashPin = await bcrypt.hash(pin.toString(), 10);

        const myReferralCode = generateReferralCode({ fullName, phoneNumber });

        // Create a new user with the additional fields
        const newUser = await Visitor.create({
            fullName,
            phoneNumber,
            pin: hashPin,
            aadhar,
            pan,
            address,
            dlno,
            dob,
            gender,
            email,
            referralCode,
            myReferralCode
        });

        if (referralCode) {
            referrer = await Visitor.findOne({ myReferralCode: referralCode });

            if (!referrer) {
                throw new ApiError(400, 'Referral code does not exists');
            }

            await Referral.create({ referralCode, referrer, referredUser: newUser });

        }

        // Prepare the response data
        const data = {
            userId: newUser._id,
            fullName: newUser.fullName,
            phoneNumber: newUser.phoneNumber,
            aadhar: newUser.aadhar,
            pan: newUser.pan,
            address: newUser.address,
            dlno: newUser.dlno,
            dob: newUser.dob,
            gender: newUser.gender,
            email: newUser.email,
            referralCode: newUser.referralCode,
        };

        return res.json(new ApiResponse(201, data, "User registered Successfully"));
    } catch (error) {
        throw new ApiError(400, error.message);
    }
});

export function validateFields(fields) {
    // console.log(fields)
    if (fields.some((field) => field === "")) {
        throw new ApiError(400, "All fields are required and must be valid strings");
    }
}

export async function verifyAadharAndPAN(aadharNumber, panNumber, fullName, dob, gender, phoneNumber) {
    try {
        const aadharResponse = await aadharVerification(aadharNumber, fullName, dob, gender, phoneNumber);

        if (aadharResponse.error_description) {
            throw new ApiError(400, 'The data on Aadhaar does not match.');
        }

        const { code, code_verifier } = aadharResponse;

        // Handle PAN verification with the extracted code and code_verifier
        const panVerificationResponse = await panVerification(panNumber, fullName, code, code_verifier);
        // console.log('x : ', panVerificationResponse)

        if (panVerificationResponse.error === 'true') {
            throw new ApiError(400, 'Pan Verification Failed');
        }

        return;
    } catch (error) {
        // console.log('Error in verifyAadharAndPAN:', error.message);
        throw new ApiError(400, error.message);
    }
}


const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

// Set up multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
    fileFilter: (req, file, cb) => {
        if (['image/jpeg', 'image/png', 'image/jpg', 'image/pdf'].includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new ApiError(400, 'Invalid file type. Please upload an image.'), false);
        }
    },
}).single('profileImage'); // Accept only one file with the key 'profileImage'

// Helper function to upload to S3
const uploadToS3 = async (buffer, fileName, mimeType) => {
    const params = {
        Bucket: process.env.AWS_BUCKET,
        Key: `media/${Date.now()}-${fileName}`, // Unique file name
        Body: buffer,
        ContentType: mimeType, // Dynamically set MIME type
    };

    try {
        const s3Data = await s3.upload(params).promise();
        console.log('s3Data.Location', s3Data.Location);
        return s3Data.Location; // Return the uploaded file's URL
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw new ApiError(500, 'Error uploading image to S3');
    }
};

// Registration route
const register = asyncHandler(async (req, res) => {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: 'Multer error: ' + err.message });
        } else if (err) {
            return res.status(err.statusCode || 500).json({ message: err.message });
        }

        try {
            const {
                fullName,
                phoneNumber,
                email,
                gstin,
                type,
                companyName,
                website,
                aadharNumber,
                panNumber,
                dob,
                gender,
                dlNumber,
            } = req.body;

            const parsedDob = JSON.parse(dob); // Example parsedDob

            // Create a Date object
            const dateObj = new Date(parsedDob);

            // Format the date
            const formattedDob = `${String(dateObj.getDate()).padStart(2, '0')}${String(dateObj.getMonth() + 1).padStart(2, '0')}${dateObj.getFullYear()}`;

            // console.log(formattedDate); 


            // Validate phone number
            if (!phoneNumber || isNaN(Number(phoneNumber))) {
                throw new ApiError(400, 'Please enter a correct phone number.');
            }

            // Check if user already exists
            // Create an array to hold conditions
            const conditions = [];

            if (phoneNumber) {
                conditions.push({ phoneNumber });
            }
            if (email) {
                conditions.push({ email });
            }
            if (aadharNumber) {
                conditions.push({ aadharNumber });
            }
            if (panNumber) {
                conditions.push({ panNumber });
            }
            if (dlNumber) {
                conditions.push({ dlNumber });
            }

            // Only run the query if conditions exist
            let existingUser = null;
            if (conditions.length > 0) {
                existingUser = await User.findOne({ $or: conditions });
            }

            if (existingUser) {
                // Handle the conflict here
                let conflictField = '';
                if (existingUser.phoneNumber === phoneNumber) {
                    conflictField = 'phone number';
                } else if (existingUser.email === email) {
                    conflictField = 'email';
                } else if (existingUser.aadharNumber === aadharNumber) {
                    conflictField = 'Aadhar number';
                } else if (existingUser.panNumber === panNumber) {
                    conflictField = 'PAN number';
                } else if (existingUser.dlNumber === dlNumber) {
                    conflictField = 'Driving License number';
                }

                throw new ApiError(400, `User with this ${conflictField} already exists.`);
            }

            // Process profile image
            let profileImageUrl = null;
            if (req.file) {
                profileImageUrl = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype);
            }

            // Validate and create user based on type
            let userData = { fullName, phoneNumber, email, type, profileImage: profileImageUrl };

            switch (type) {
                case 'consumer':
                    validateFields([fullName, phoneNumber, email, gstin, companyName, website]);
                    //verify GST
                    // await gstVerification(gstin);
                    Object.assign(userData, { gstin, companyName, website });
                    break;

                case 'transporter':
                    validateFields([fullName, phoneNumber, aadharNumber, panNumber, formattedDob, gender]);
                    //verify Aadhar, Pan
                    await verifyAadharAndPAN(aadharNumber, panNumber, fullName, formattedDob, gender, phoneNumber);
                    Object.assign(userData, { aadharNumber, panNumber, dob: formattedDob, gender });
                    break;

                case 'owner':
                case 'broker':
                    validateFields([fullName, phoneNumber, aadharNumber, panNumber, formattedDob, gender]);
                    //verify Aadhar, Pan
                    await verifyAadharAndPAN(aadharNumber, panNumber, fullName, formattedDob, gender, phoneNumber);
                    Object.assign(userData, { aadharNumber, panNumber, dob: formattedDob, gender });
                    break;

                case 'driver':
                    validateFields([fullName, phoneNumber, aadharNumber, panNumber, dlNumber, formattedDob, gender]);
                    //verify Aadhar, Pan, Dl
                    // await verifyAadharAndPAN(aadharNumber, panNumber, fullName, formattedDob, gender, phoneNumber);
                    await drivingLicenceVerification(dlNumber, formattedDob);
                    Object.assign(userData, { aadharNumber, panNumber, dlNumber, dob: formattedDob, gender });
                    break;

                default:
                    throw new ApiError(400, 'Invalid user type.');
            }

            // Create user
            await User.create(userData);

            return res.status(201).json({ message: 'User registered successfully.', profileImageUrl });
        } catch (error) {
            console.error('Error during registration:', error);
            return res.status(error.statusCode || 500).json({ message: error.message });
        }
    });
});


const sendOtpOnPhone = asyncHandler(async (req, res) => {
    try {
        const otp = otpGenerator.generate(4, { upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false });

        const phoneNumber = req.body.phoneNumber;

        // sent otp on mobile number
        // await axios.get('https://www.fast2sms.com/dev/bulkV2', {
        //     params: {
        //         authorization: process.env.FAST2SMS_API_KEY,
        //         variables_values: otp,
        //         route: 'otp',
        //         numbers: phoneNumber
        //         schedule_time = ""
        //         flash = "0"
        //     }
        // });

        return res.status(201).json(
            new ApiResponse(201, { otp }, "OTP sent successfully!"));
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(400).json(
            { success: false, message: 'Failed to send OTP.' }
        );
    }
})


const sendOtpOnEmail = asyncHandler(async (req, res) => {
    const { to, companyName } = req.body;
    const otp = otpGenerator.generate(4, { upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false });
    const from = process.env.SENDER_MAIL_ID;
    const body = `<p>Hi ${companyName},</p><p>Your Email OTP for Signup is ${otp}.</p>
                <p>Your OTP expires in 5 minutes.</p>
                <p>Regards,</p>
                <p>Transvue Soultion`;

    try {
        await sendEmail(to, from, subject, body);
        return res.status(201).json(
            new ApiResponse(201, { otp }, "OTP sent successfully!"));
    } catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).send('Error sending email');
    }
})

const sendLoginOtp = asyncHandler(async (req, res) => {
    const { phoneNumber } = req.body;

    // console.log(phoneNumber, type);

    if (!phoneNumber || isNaN(Number(phoneNumber))) {
        throw new ApiError(400, "Please enter a valid phone number.");
    }

    // console.log(type)
    const user = await User.findOne({ phoneNumber });
    // console.log(user);
    if (!user) {
        throw new ApiError(404, "User with this phone number does not exist.");
    }

    const otp = otpGenerator.generate(4, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false
    });

    // Optionally save the OTP in the user's record (with expiration)
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000; // OTP valid for 5 minutes
    await user.save();


    return res.status(200).json(
        new ApiResponse(200, { otp }, "OTP sent successfully!")
    );
});

const getUserByPhoneNumber = asyncHandler(async (req, res) => {
    try {
        const { phoneNumber } = req.params;

        // Validate phone number
        if (!phoneNumber || isNaN(Number(phoneNumber))) {
            throw new ApiError(400, "Please provide a valid phone number.");
        }

        // Fetch user details
        const user = await User.findOne({ phoneNumber });

        if (!user) {
            throw new ApiError(404, "User not found.");
        }

        // Respond with user details
        res.status(200).json(user);
    } catch (error) {
        throw new ApiError(400, error.message);
    }
});

const getUserById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID
        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            throw new ApiError(400, "Please provide a valid user ID.");
        }

        // Fetch user details
        const user = await User.findById(id);

        if (!user) {
            throw new ApiError(404, "User not found.");
        }

        // Respond with user details
        res.status(200).json(user);
    } catch (error) {
        throw new ApiError(400, error.message);
    }
});

const updateUserByPhoneNumber = asyncHandler(async (req, res) => {
    try {
        const { phoneNumber } = req.params;
        // console.log('req body ', req.body);
        const {
            fullName, profileImage, email, gstin, type, companyName,
            website, aadharNumber, panNumber, dob, gender, dlNumber
        } = req.body;

        // Validate phone number
        if (!phoneNumber || isNaN(Number(phoneNumber)) || phoneNumber.length < 10) {
            throw new ApiError(400, "Please enter a valid phone number.");
        }

        // Find user by phone number
        const existingUser = await User.findOne({ phoneNumber });

        if (!existingUser) {
            throw new ApiError(404, "User with this phone number does not exist.");
        }

        // Validate fields based on user type
        switch (existingUser.type) {
            case 'consumer':
                validateFields([fullName, phoneNumber, email, gstin, type, companyName, website]);
                break;
            case 'transporter':
                validateFields([fullName, phoneNumber, email, type, aadharNumber, panNumber, dob, gender]);
                break;
            case 'owner':
            case 'broker':
                validateFields([fullName, phoneNumber, type, aadharNumber, panNumber]);
                break;
            case 'driver':
                validateFields([fullName, phoneNumber, type, aadharNumber, panNumber, dlNumber, dob]);
                break;
            default:
                throw new ApiError(400, "User type not found.");
        }

        // Prepare update object, only include provided fields
        const updateData = {};
        if (fullName) updateData.fullName = fullName;
        if (email) updateData.email = email;
        if (gstin) updateData.gstin = gstin;
        if (type) updateData.type = type;
        if (companyName) updateData.companyName = companyName;
        if (website) updateData.website = website;
        if (aadharNumber) updateData.aadharNumber = aadharNumber;
        if (panNumber) updateData.panNumber = panNumber;
        if (dob) updateData.dob = dob;
        if (gender) updateData.gender = gender;
        if (dlNumber) updateData.dlNumber = dlNumber;
        if (profileImage) updateData.profileImage = profileImage;

        // console.log('file gfgfgfgfg ', req.file);
        // If a new profile image is provided, update it
        // if (req.file) {
        //     console.log('File ************: ', req.file)
        //     const profileImageUrl = await uploadToS3(req.file.buffer, req.file.originalname, req.file.type);

        //     updateData.profileImage = [profileImageUrl]; // Save image URL in the profileImage array
        // }

        // Update the user in the database
        const updatedUser = await User.findOneAndUpdate(
            { phoneNumber },
            updateData,
            { new: true }
        );

        return res.status(200).json({ message: "User data updated successfully", data: updatedUser });

    } catch (error) {
        throw new ApiError(400, error.message);
    }
});



const generateToken = (userId) => {
    let jwtSecretKey = process.env.JWT_SECRET_KEY;
    let data = {
        time: Date(),
        userId,
    }

    const token = jwt.sign(data, jwtSecretKey, { expiresIn: '1h' });

    return token;
}

const verifyLoginOtp = asyncHandler(async (req, res) => {
    const { otp, phoneNumber } = req.body;

    if (!otp || !phoneNumber) {
        throw new ApiError(400, 'All fields are required');
    }

    const user = await User.findOne({ phoneNumber });

    if (user.otpExpires < Date.now()) {
        throw new ApiError(400, 'Your OTP has expired. Please request a new one to continue.');
    }

    if (user.otp !== Number(otp)) {
        throw new ApiError(400, 'Invalid OTP');
    }

    const token = generateToken(user._id);

    return res.status(200).json(
        new ApiResponse(200, { token, type: user.type, id: user._id }, "Login successful !")
    );
});


const updateUserLocation = asyncHandler(async (req, res) => {
    const { userId, latitude, longitude } = req.body;

    // Ensure all required fields are present
    if (!userId || latitude === undefined || longitude === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: userId, latitude, or longitude.'
        });
    }

    // Validate latitude and longitude (they should be numbers)
    if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({
            success: false,
            message: 'Latitude and Longitude must be valid numbers.'
        });
    }

    const cellId = await getCellId(latitude, longitude);

    // Update the user's location in the database
    const user = await User.findByIdAndUpdate(
        userId,
        { currentLocation: { latitude, longitude }, cellId },
        { new: true } // Return the updated document
    );

    // Handle case where user is not found
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found.'
        });
    }

    // Return success response
    return res.status(200).json({
        success: true,
        user,
        message: 'Location updated successfully.'
    });
});

const addBroker = asyncHandler(async (req, res) => {
    const { ownerId, vehicleNumber, brokerPhoneNumber } = req.body;

    // Validate input
    if (!ownerId || !vehicleNumber || !brokerPhoneNumber) {
        throw new ApiError(400, "Please fill in all required details");
    }

    // Fetch the owner, vehicle, and broker concurrently
    const [owner, vehicle, broker] = await Promise.all([
        User.findById(ownerId),
        Vehicle.findOne({ vehicleNumber, owner: ownerId }),
        User.findOne({ phoneNumber: brokerPhoneNumber, type: 'broker' })
    ]);

    // console.log('ow:', owner, 'Broker: ', broker, 'vehicle : ', vehicle);

    // Validate existence of records
    if (!owner) throw new ApiError(404, "Owner not found");
    if (!vehicle) throw new ApiError(404, "Vehicle not found");
    if (!broker) throw new ApiError(404, "Broker not found");

    // Update vehicle with broker information
    // vehicle.broker = broker; // Ensure `broker` is properly referenced
    // await vehicle.save();

    const vehicle2 = await Vehicle.findByIdAndUpdate(vehicle._id, { broker }, { new: true });
    // console.log(vehicle2);
    // Return success response
    return res.status(200).json({
        success: true,
        message: "Broker added successfully!",
    });
});

const updateUserLocation1 = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { latitude, longitude } = req.body;

    // Validate latitude and longitude
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        throw new ApiError(400, 'Invalid location data. Latitude and longitude must be numbers.');
    }

    // Find the user by userId
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found.');
    }

    // Update the user's currentLocation
    user.currentLocation = { latitude, longitude };

    // Save the updated user data
    await user.save();

    return res.status(200).json({
        message: 'User location updated successfully',
        user: {
            id: user._id,
            currentLocation: user.currentLocation
        }
    });
});

const updateStatus = async (req, res) => {
    const { userId } = req.params;
    const { status } = req.body;

    if (!status || !["online", "offline"].includes(status)) {
        return res.status(400).json({ message: "Valid status is required." });
    }

    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { status },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "Status updated successfully", user });
    } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).json({ message: "Error updating status", error });
    }
};

const uploadImages = async (req, res) => {
    try {
        // if (!req.file || !req.files) return;

        const files = req.file ? [req.file] : req.files;

        console.log(' file Array', files);
        const fileUrls = [];

        // fileUrls.push(s3Data.Location);

        // Loop through each uploaded file and upload to S3
        for (let file of files) {
            const fileUrl = await uploadToS3(file.buffer, file.originalname, file.mimetype);
            fileUrls.push(fileUrl);  // Save the S3 image URL
        }
        // console.log('file urls', fileUrls);
        return res.status(200).json({ success: true, fileUrl: fileUrls });
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw new ApiError(500, 'Error uploading image to S3');
    }
};


const savePushToken = async (req, res) => {
    try {
        const { userId, expoPushToken } = req.body;

        if (!userId || !expoPushToken) {
            throw new Error('All fields are required');
        }

        const user = await User.findByIdAndUpdate(userId, { pushNotificationToken: expoPushToken });
        // console.log('User', user);

        return res.status(200).json({ success: true, message: "Expopushtoken updated successfully" })
    } catch (error) {
        console.log('Error', error.message);
        throw new Error('Failed to update expoPushToken');
    }
}

export {
    register, sendOtpOnPhone, sendOtpOnEmail, uploadToS3, sendLoginOtp, getUserByPhoneNumber, updateUserByPhoneNumber, generateToken, verifyLoginOtp, updateUserLocation, getUserById, updateUserLocation1, updateStatus, addBroker, uploadImages, savePushToken
}