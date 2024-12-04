import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import axios from "axios";
import otpGenerator from 'otp-generator';
import { subject } from '../constants.js';
import { sendEmail } from '../utils/sendEmail.js';
import { aadharVerification, panVerification } from "../utils/digilocker.js";
import { gstVerification } from "../utils/gstinVerification.js";
import { drivingLicenceVerification } from "../utils/drivingLicenceVerification.js";
// import { s3 } from '../utils/sesConfig.js';
import jwt from 'jsonwebtoken';
import AWS from 'aws-sdk';
import multer from 'multer';

import { sendEmailNotification } from "../../utils/notification.js";

export function validateFields(fields) {
    // console.log(fields)
    if (fields.some((field) => field.trim() === "")) {
        throw new ApiError(400, "All fields are required and must be valid strings");
    }

}

async function verifyAadharAndPAN(aadharNumber, panNumber, fullName, dob, gender, phoneNumber) {
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
        if (['image/jpeg', 'image/png', 'image/jpg'].includes(file.mimetype)) {
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
        Key: `profile-images/${Date.now()}-${fileName}`, // Unique file name
        Body: buffer,
        ContentType: mimeType, // Dynamically set MIME type
    };

    try {
        const s3Data = await s3.upload(params).promise();
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

            // Validate phone number
            if (!phoneNumber || isNaN(Number(phoneNumber))) {
                throw new ApiError(400, 'Please enter a correct phone number.');
            }

            // Check if user already exists
            const existingUser = await User.findOne({ phoneNumber });
            if (existingUser) {
                throw new ApiError(400, 'User with this phone number already exists.');
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
                    Object.assign(userData, { gstin, companyName, website });
                    break;

                case 'transporter':
                    validateFields([fullName, phoneNumber, aadharNumber, panNumber, dob, gender]);
                    Object.assign(userData, { aadharNumber, panNumber, dob, gender });
                    break;

                case 'owner':
                case 'broker':
                    validateFields([fullName, phoneNumber, aadharNumber, panNumber]);
                    Object.assign(userData, { aadharNumber, panNumber });
                    break;

                case 'driver':
                    validateFields([fullName, phoneNumber, aadharNumber, panNumber, dlNumber, dob, gender]);
                    Object.assign(userData, { aadharNumber, panNumber, dlNumber, dob, gender });
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


// const register = asyncHandler(async (req, res) => {
//     try {
//         const {
//             fullName,
//             profileImage,
//             phoneNumber,
//             email,
//             gstin,
//             type,
//             companyName,
//             website,
//             aadharNumber,
//             panNumber,
//             dob,
//             gender,
//             dlNumber,
//         } = req.body;

//         // Validate phone number
//         if (!phoneNumber || isNaN(Number(phoneNumber))) {
//             throw new ApiError(400, "Please enter a correct phone number.");
//         }

//         // Check if user already exists
//         const existingUser = await User.findOne({ phoneNumber });
//         if (existingUser) {
//             throw new ApiError(400, "User with this phone number already exists.");
//         }

//         // Validate and create user based on type
//         let userData = { fullName, profileImage, phoneNumber, email, type };

//         switch (type) {
//             case "consumer":
//                 validateFields([fullName, phoneNumber, email, gstin, companyName, website]);
//                 Object.assign(userData, { gstin, companyName, website });
//                 break;

//             case "transporter":
//                 validateFields([fullName, phoneNumber, aadharNumber, panNumber, dob, gender]);
//                 Object.assign(userData, { aadharNumber, panNumber, dob, gender });
//                 break;

//             case "owner":
//             case "broker":
//                 validateFields([fullName, phoneNumber, aadharNumber, panNumber]);
//                 Object.assign(userData, { aadharNumber, panNumber });
//                 break;

//             case "driver":
//                 validateFields([fullName, phoneNumber, aadharNumber, panNumber, dlNumber, dob, gender]);
//                 Object.assign(userData, { aadharNumber, panNumber, dlNumber, dob, gender });
//                 break;

//             default:
//                 throw new ApiError(400, "Invalid user type.");
//         }

//         // Create user
//         await User.create(userData);

//         return res.status(201).json({ message: "User registered successfully." });
//     } catch (error) {
//         // Log the error for debugging
//         console.error("Error during registration:", error);

//         // Send appropriate error response
//         return res.status(error.statusCode || 500).json({
//             message: error.message || "An unexpected error occurred.",
//         });
//     }
// });

// const register = asyncHandler(async (req, res) => {
//     try {
//         const { fullName, profileImage, phoneNumber, email, gstin, type, companyName, website, aadharNumber, panNumber, dob, gender, dlNumber } = req.body;

//         if (!phoneNumber || isNaN(Number(phoneNumber))) {
//             throw new ApiError(400, "Please enter a correct phone number.");
//         }

//         const existingUser = await User.findOne({ phoneNumber });

//         if (existingUser) {
//             throw new ApiError(400, "User with this phone number already exists");
//         }

//         switch (type) {
//             case 'consumer':
//                 validateFields([fullName, phoneNumber, email, gstin, type, companyName, website]);
//                 // await gstVerification(gstin);
//                 await User.create({ fullName, phoneNumber, email, gstin, type, companyName, website, profileImage });
//                 return res.status(201).json({ message: "User registered successfully" });

//             case 'transporter':
//                 validateFields([fullName, phoneNumber, email, type, aadharNumber, panNumber, dob, gender]);
//                 // await verifyAadharAndPAN(aadharNumber, panNumber, fullName, dob, gender, phoneNumber);
//                 await User.create({ fullName, phoneNumber, email, type, companyName, website, aadharNumber, panNumber, profileImage, dob, gender });
//                 return res.status(201).json({ message: "User registered successfully" });

//             case 'owner':
//             case 'broker':
//                 validateFields([fullName, phoneNumber, type, aadharNumber, panNumber]);
//                 // await verifyAadharAndPAN(aadharNumber, panNumber, fullName, dob, gender, phoneNumber);
//                 await User.create({ fullName, phoneNumber, type, aadharNumber, panNumber, profileImage });
//                 return res.status(201).json({ message: "User registered successfully" });

//                 case 'driver':
//                     // Make sure to include `dob` and `gender` in the validateFields function
//                     validateFields([fullName, phoneNumber, type, aadharNumber, panNumber, dlNumber, dob, gender]);

//                     // You can also add further verification here for Aadhar, PAN, or Driving License if needed.
//                     // await verifyAadharAndPAN(aadharNumber, panNumber, fullName, dob, gender, phoneNumber);
//                     // await drivingLicenceVerification(dlNumber, dob);

//                     // Create the driver user with all required fields, including `dob` and `gender`
//                     await User.create({
//                         fullName,
//                         phoneNumber,
//                         type,
//                         aadharNumber,
//                         panNumber,
//                         dlNumber,
//                         profileImage,
//                         dob,
//                         gender 
//                     });

//                     return res.status(201).json({ message: "User registered successfully" });


//             default:
//                 throw new ApiError(400, "User type not found");
//         }

//     } catch (error) {
//         throw new ApiError(400, error.message);
//     }
// });


const sendOtpOnPhone = asyncHandler(async (req, res) => {
    try {
        const otp = otpGenerator.generate(4, { upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false });

        const phoneNumber = req.body.phoneNumber;

        // sent otp on mobile number
        await axios.get('https://www.fast2sms.com/dev/bulkV2', {
            params: {
                authorization: process.env.FAST2SMS_API_KEY,
                variables_values: otp,
                route: 'otp',
                numbers: phoneNumber
            }
        });

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

// async function uploadToS3(req, res) {

//     if (!req.files || req.files.length === 0) {
//         return res.status(400).send('No files uploaded.');
//     }

//     try {
//         const uploadPromises = req.files.map((file) => {
//             const uploadParams = {
//                 Bucket: process.env.AWS_BUCKET,
//                 Key: file.originalname, // Use the original file name as the S3 key
//                 Body: file.buffer,
//                 ContentType: file.mimetype, // Set the appropriate content type
//             };

//             return s3.upload(uploadParams).promise();
//         });

//         const results = await Promise.all(uploadPromises);

//         const uploadedFiles = results.map(result => result.Location);
//         console.log('Files uploaded successfully:', uploadedFiles);
//         res.send(`Files uploaded successfully to: ${uploadedFiles.join(', ')}`);

//     } catch (error) {
//         console.error('Error uploading files to S3:', error);
//         res.status(500).send('Error uploading files');
//     }
// }


const sendLoginOtp = asyncHandler(async (req, res) => {
    const { phoneNumber, type } = req.body;

    if (!phoneNumber || isNaN(Number(phoneNumber))) {
        throw new ApiError(400, "Please enter a valid phone number.");
    }

    console.log(type)
    const user = await User.findOne({ phoneNumber, type: { $in: type ? type : [] }, });
    console.log(user);
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

    // Send OTP via SMS (using Fast2SMS or similar)
    // await axios.get('https://www.fast2sms.com/dev/bulkV2', {
    //     params: {
    //         authorization: process.env.FAST2SMS_API_KEY,
    //         variables_values: otp,
    //         route: 'otp',
    //         numbers: phoneNumber
    //     }
    // });

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



// const updateUserByPhoneNumber = asyncHandler(async (req, res) => {
//     try {
//         const { phoneNumber } = req.params; // Get phoneNumber from URL params
//         const {
//             fullName, profileImage, email, gstin, type, companyName,
//             website, aadharNumber, panNumber, dob, gender, dlNumber
//         } = req.body;

//         // Validate phone number
//         if (!phoneNumber || isNaN(Number(phoneNumber)) || phoneNumber.length < 10) {
//             throw new ApiError(400, "Please enter a valid phone number.");
//         }

//         // Find user by phone number
//         const existingUser = await User.findOne({ phoneNumber });

//         if (!existingUser) {
//             throw new ApiError(404, "User with this phone number does not exist.");
//         }

//         // Validate fields based on user type
//         switch (existingUser.type) {
//             case 'consumer':
//                 validateFields([fullName, phoneNumber, email, gstin, type, companyName, website]);
//                 break;
//             case 'transporter':
//                 validateFields([fullName, phoneNumber, email, type, aadharNumber, panNumber, dob, gender]);
//                 break;
//             case 'owner':
//             case 'broker':
//                 validateFields([fullName, phoneNumber, type, aadharNumber, panNumber]);
//                 break;
//             case 'driver':
//                 validateFields([fullName, phoneNumber, type, aadharNumber, panNumber, dlNumber, dob]);
//                 break;
//             default:
//                 throw new ApiError(400, "User type not found.");
//         }

//         // Prepare update object, only include provided fields
//         const updateData = {};
//         if (fullName) updateData.fullName = fullName;
//         if (profileImage) updateData.profileImage = profileImage;
//         if (email) updateData.email = email;
//         if (gstin) updateData.gstin = gstin;
//         if (type) updateData.type = type;
//         if (companyName) updateData.companyName = companyName;
//         if (website) updateData.website = website;
//         if (aadharNumber) updateData.aadharNumber = aadharNumber;
//         if (panNumber) updateData.panNumber = panNumber;
//         if (dob) updateData.dob = dob;
//         if (gender) updateData.gender = gender;
//         if (dlNumber) updateData.dlNumber = dlNumber;

//         // Update the user in the database
//         const updatedUser = await User.findOneAndUpdate(
//             { phoneNumber },
//             updateData,
//             { new: true }
//         );

//         return res.status(200).json({ message: "User data updated successfully", data: updatedUser });

//     } catch (error) {
//         throw new ApiError(400, error.message);
//     }
// });


const updateUserByPhoneNumber = asyncHandler(async (req, res) => {
    try {
        const { phoneNumber } = req.params;
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
        // if (profileImage) updateData.profileImage = profileImage;

console.log('file gfgfgfgfg ',req.file);
        // If a new profile image is provided, update it
        if (req.file) {
           const profileImageUrl = await uploadToS3(req.file.buffer, req.file.originalname, req.file.type);

            updateData.profileImage = [profileImageUrl]; // Save image URL in the profileImage array
        }

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



const generateToken = (phoneNumber) => {
    let jwtSecretKey = process.env.JWT_SECRET_KEY;
    let data = {
        time: Date(),
        phoneNumber,
    }

    const token = jwt.sign(data, jwtSecretKey);

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

    const token = generateToken(phoneNumber);

    return res.status(200).json(
        new ApiResponse(200, { token }, "Login successful !")
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

    // Update the user's location in the database
    const user = await User.findByIdAndUpdate(
        userId,
        { currentLocation: { latitude, longitude } },
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



export {
    register, sendOtpOnPhone, sendOtpOnEmail, uploadToS3, sendLoginOtp, getUserByPhoneNumber, updateUserByPhoneNumber, generateToken, verifyLoginOtp, updateUserLocation, getUserById
}