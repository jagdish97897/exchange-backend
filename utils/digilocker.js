import axios from "axios";
import { ulipToken } from "./ulipApiAccess.js";
import { ApiError } from "../src/utils/ApiError.js";
import { asyncHandler } from "../src/utils/asyncHandler.js";


// const aadharVerification = asyncHandler(
async function aadharVerification(uid, name, dob, gender, mobile) {
    try {
        // Check if any field is empty
        if (
            [uid, name, dob, gender, mobile].some((field) => field?.trim() === "")
        ) {
            throw new ApiError(400, "All fields are required");
        }

        const options = {
            method: 'POST',
            url: 'https://www.ulipstaging.dpiit.gov.in/ulip/v1.0.0/DIGILOCKER/01',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ulipToken}`,
            },
            data: { uid, name, dob, gender: gender.toLowerCase() === 'male' ? 'M' : 'female' ? 'F' : 'O', mobile, consent: "Y" }
        };

        const apiResponse = await axios.request(options);
        // console.log('apiResponse:', apiResponse.data);  // Log the full API response

        const response = apiResponse?.data?.response?.[0]?.response;
        // console.log('Extracted response:', response);

        // If response is undefined or not as expected, log an error
        if (apiResponse.data.error === 'true') {
            throw new ApiError(400, ('Aadhar Verification Failed'));
        }

        return response;
    } catch (error) {
        if (error.response) {
            console.log('Error', error.response.data);
            throw new ApiError(400, ('Invalid Data format OR Aadhar number'));
        } else {
            console.log('Error', error.message);
            throw new ApiError(400, 'Invalid Aadhar number');
        }
    }
}

// );


// For new users only. User do not have digilocker account will recieve otp on moible number
// async function digilockerOtpVerification(req, res) {

//     try {
//         const { mobile, otp, code_challenge, code_verifier } = req.body;

//         if (
//             [mobile, otp, code_challenge, code_verifier].some((field) => field?.trim() === "")
//         ) {
//             throw new ApiError(400, "All fields are required")
//         }

//         const options = {
//             method: 'POST',
//             url: 'https://www.ulipstaging.dpiit.gov.in/ulip/v1.0.0/DIGILOCKER/02',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${ulipToken}`,
//             },
//             data: { mobile, otp, code_challenge, code_verifier }
//         }

//         const apiResponse = await axios.request(options);
//         const response = apiResponse?.data?.response?.[0]?.response;

//       if (apiResponse.data.error === 'true') {
//          throw new ApiError(400, ('Aadhar Verification Failed'));
//       }

//         return res.status(200).json(response);
//     }
//     catch (error) {
//    if (error.response) {
//     console.log('Error', error.response.data);
//     throw new ApiError(400, ('Invalid Data format OR Aadhar number'));
// } else {
//     console.log('Error', error.message);
//     throw new ApiError(400, 'Invalid Aadhar number');
// }
//     }
// };

async function digilockerToken(code, code_verifier) {

    // console.log('code && code_verifier', code, code_verifier)

    try {

        if (
            [code, code_verifier].some((field) => field?.trim() === "")
        ) {
            throw new ApiError(400, "All fields are required")
        }

        const options = {
            method: 'POST',
            url: 'https://www.ulipstaging.dpiit.gov.in/ulip/v1.0.0/DIGILOCKER/03',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ulipToken}`,
            },
            data: { code, code_verifier }
        }

        const apiResponse = await axios.request(options);
        const token = apiResponse?.data?.response?.[0]?.response.access_token;

        return token;
    }
    catch (error) {
        if (error.response) {
            console.log('Error', error.response.data);
            throw new ApiError(400, ('Invalid Data format OR Aadhar number'));
        } else {
            console.log('Error', error.message);
            throw new ApiError(400, 'Invalid Aadhar number');
        }
    }
};

// async function panVerification(req, res) {
async function panVerification(panno, PANFullName, code, code_verifier) {
    try {
        // const { panno, PANFullName, code, code_verifier } = req.body;

        if (
            [panno, PANFullName, code, code_verifier].some((field) => field?.trim() === "")
        ) {
            throw new ApiError(400, "All fields are required")
        }

        const token = await digilockerToken(code, code_verifier);

        // console.log('token', token);

        const options = {
            method: 'POST',
            url: 'https://www.ulipstaging.dpiit.gov.in/ulip/v1.0.0/DIGILOCKER/04',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ulipToken}`,
            },
            data: { panno, PANFullName, token, consent: "Y" }
        }

        const apiResponse = await axios.request(options);
        const response = apiResponse?.data?.response?.[0]?.response;

        if (apiResponse.data.error === 'true') {
            throw new ApiError(400, ('PAN Verification Failed'));
        }

        return response;
    }
    catch (error) {
        if (error.response) {
            console.log('Error', error.response.data);
            throw new ApiError(400, ('Invalid Data format OR PAN number'));
        } else {
            console.log('Error', error.message);
            throw new ApiError(400, 'Invalid PAN number');
        }
    }
};

export { aadharVerification, panVerification };
