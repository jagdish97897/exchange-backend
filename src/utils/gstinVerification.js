import axios from "axios";
import { ulipToken } from "./ulipApiAccess.js";
import { ApiError } from "./ApiError.js";

async function gstVerification(gstin) {

    try {
        if (!gstin.length) {
            throw new ApiError(400, "Please enter GST number");
        }

        const options = {
            method: 'POST',
            url: 'https://www.ulipstaging.dpiit.gov.in/ulip/v1.0.0/GST/01',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ulipToken}`,
            },
            data: { gstin }
        };

        const apiResponse = await axios.request(options);
        const response = apiResponse?.data?.response?.[0]?.response;

        if (apiResponse.data.error === 'true') {
            throw new ApiError(400, ('GST Verification Failed'));
        }

        // return res.status(200).json(response);
        return response;
    }
    catch (error) {
        console.log('Error', error);
        // res.status(400).json(error.message);
        throw new ApiError(400, error.message);
    }
};

export { gstVerification };