import axios from "axios";
import { ulipToken } from "./ulipApiAccess.js";
import { ApiError } from "./ApiError.js";

async function drivingLicenceVerification(dlnumber, dob) {

    try {
        // const { dlnumber, dob } = req.body;

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
    }
    catch (error) {
        console.log('Error', error);
        // res.status(400).json(error.message);
        throw new ApiError(400, error.message);
    }
};

export { drivingLicenceVerification };