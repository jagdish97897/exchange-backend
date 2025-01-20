import axios from "axios";
import { ulipToken } from "./ulipApiAccess.js";
import { ApiError } from "../src/utils/ApiError.js";

async function drivingLicenceVerification(dlnumber, dob) {
    try {
        if (
            [dlnumber, dob].some((field) => field?.trim() === "")
        ) {
            throw new ApiError(400, "All fields are required")
        }

        const options = {
            method: 'POST',
            url: 'https://www.ulipstaging.dpiit.gov.in/ulip/v1.0.0/SARATHI/01',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ulipToken}`,
            },
            data: { dlnumber, dob }
        };

        const apiResponse = await axios.request(options);
        const response = apiResponse?.data?.response?.[0]?.response;

        if (apiResponse.data.error === 'true') {
            throw new ApiError(400, ('DL Verification Failed'));
        }

        return response;
    } catch (error) {
        if (error.response) {
            console.log('Error', error.response.data);
            throw new ApiError(400, ('Invalid Data format OR DL number'));
        } else {
            console.log('Error', error.message);
            throw new ApiError(400, 'Invalid DL number');
        }
    }
};

export { drivingLicenceVerification };