import axios from "axios";
import { ulipToken } from "./ulipApiAccess.js";
import { ApiError } from "./ApiError.js";

// async function aadharVerification(req, res) {

// async function aadharVerification(uid, name, dob, gender, mobile) {
//     try {
//         // const { uid, name, dob, gender, mobile } = req.body;

//         if (
//             [uid, name, dob, gender, mobile].some((field) => field?.trim() === "")
//         ) {
//             throw new ApiError(400, "All fields are required")
//         }

//         const options = {
//             method: 'POST',
//             url: 'https://www.ulipstaging.dpiit.gov.in/ulip/v1.0.0/DIGILOCKER/01',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${ulipToken}`,
//             },
//             data: { uid, name, dob, gender, mobile, consent: "Y" }
//         };

//         const apiResponse = await axios.request(options);
//         const response = apiResponse?.data?.response?.[0]?.response;

//         // return res.status(200).json(response);
//         console.log('response is', response);
//         return response;
//     }
//     catch (error) {
//         console.log('Error', error);
//         // res.status(400).json(error.message);
//         throw new ApiError(400, error.message);
//     }
// };

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
            data: { uid, name, dob, gender, mobile, consent: "Y" }
        };

        const apiResponse = await axios.request(options);
        // console.log('apiResponse:', apiResponse.data);  // Log the full API response

        const response = apiResponse?.data?.response?.[0]?.response;
        // console.log('Extracted response:', response);

        // If response is undefined or not as expected, log an error
        if (!response) {
            throw new ApiError(500, "Unexpected response structure from the API");
        }

        return response;
    } catch (error) {
        // console.log('Error:', error.message);
        throw new ApiError(400, error.message);
    }
};


// For new users only. User do not have digilocker account will recieve otp on moible number
async function digilockerOtpVerification(req, res) {

    try {
        const { mobile, otp, code_challenge, code_verifier } = req.body;

        if (
            [mobile, otp, code_challenge, code_verifier].some((field) => field?.trim() === "")
        ) {
            throw new ApiError(400, "All fields are required")
        }

        const options = {
            method: 'POST',
            url: 'https://www.ulipstaging.dpiit.gov.in/ulip/v1.0.0/DIGILOCKER/02',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ulipToken}`,
            },
            data: { mobile, otp, code_challenge, code_verifier }
        }

        const apiResponse = await axios.request(options);
        const response = apiResponse?.data?.response?.[0]?.response;

        return res.status(200).json(response);
    }
    catch (error) {
        console.log('Error', error);
        res.status(400).json(error.message);
    }
};

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
        // console.log('Error', error);
        throw new ApiError(error.message);
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
            throw new ApiError(400, ('Pan Verification Failed'));
        }

        return res.status(200).json(response);
    }
    catch (error) {
        // console.log('Error', error);

        throw new ApiError(400, (error.message));
        // res.status(400).json(error.message);
    }
};

export { aadharVerification, digilockerOtpVerification, panVerification };
