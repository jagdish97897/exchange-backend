// import unirest from "unirest";

// const sendMobileOtp=async(mobileNumber)=>{
// try{
//   await axios.get('https://www.fast2sms.com/dev/bulkV2', {
//     params: {
//         authorization: process.env.FAST2SMS_API_KEY,
//         variables_values: otp,
//         route: 'otp',
//         numbers: mobileNumber
//     }
// });
// return res.status(201).json('OTP sent successfully!');
// }
// catch(error){
//   console.error('Error sending OTP:', error);
//   res.status(400).json({ success: false, message: 'Failed to send OTP.' });
// }

// }

// export {sendMobileOtp}