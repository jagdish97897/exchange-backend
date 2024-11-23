import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";


const registerAdmin = asyncHandler( async (req, res) => {
   
    const {fullName, email, phoneNumber, password, adminSecret } = req.body
    //console.log("email: ", email);

    if (!adminSecret) {
        throw new ApiError(400, "Unauthorized access")
    }
    if (adminSecret != process.env.Organization_Token) {
        throw new ApiError(400, "Unauthorized access")
    }


    if (
        [fullName, email, phoneNumber, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ phoneNumber }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or phoneNumber already exists")
    }
    //console.log(req.files);

    const profileImageLocalPath = req.files?.profileImage[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    if (!profileImageLocalPath) {
        throw new ApiError(400, "profileImage file is required")
    }

    const profileImage = await uploadOnCloudinary(profileImageLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!profileImage) {
        throw new ApiError(400, "profileImage file is required")
    }
   

    const user = await User.create({
        fullName,
        profileImage: profileImage.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        phoneNumber,
        role: "admin"
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )

const updateUserAccountDetailsByAdmin = asyncHandler(async(req, res) => {
    const {fullName, email, phoneNumber} = req.body

    if (!(fullName && (email || phoneNumber))) {
        throw new ApiError(400, "Both fullName and email or phoneNumber are required")
    }

    const user = await User.findOneAndUpdate(
        {$or: [{phoneNumber}, {email}]},
        {
            $set: {
                fullName
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated By Admin successfully"))
});

const deleteUserByAdmin = asyncHandler(async(req, res) => {

    const {email, phoneNumber} = req.body
    if (!(email || phoneNumber)) {
        throw new ApiError(400, "email or phoneNumber are required")
    }

    await User.findOneAndDelete({$or: [{phoneNumber}, {email}]})

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Deleted Successfully"))
})

const updateUserprofileImageByAdmin = asyncHandler(async(req, res) => {

    const {email, phoneNumber} = req.body
    if (!(email || phoneNumber)) {
        throw new ApiError(400, "email or phoneNumber are required")
    }
    const profileImageLocalPath = req.file?.path

    if (!profileImageLocalPath) {
        throw new ApiError(400, "profileImage file is missing")
    }

    const profileImage = await uploadOnCloudinary(profileImageLocalPath)

    if (!profileImage.url) {
        throw new ApiError(400, "Error while uploading on profileImage")
        
    }

    const user = await User.findOneAndUpdate(
        {$or: [{phoneNumber}, {email}]},
        {
            $set:{
                profileImage: profileImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "profileImage image updated successfully by Admin")
    )
})

const changeUserPasswordByAdmin = asyncHandler(async(req, res) => {

    const {newPassword, email, phoneNumber} = req.body

    if (!(newPassword && (email || phoneNumber))) {
        throw new ApiError(400, "Both newPassword and email or phoneNumber are required")
    }

    const user = await User.findOne({$or: [{phoneNumber}, {email}]})
    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully by Admin"))
})

const viewUserDetails = asyncHandler(async(req, res) => {

    const {email, phoneNumber} = req.body
    if (!(email || phoneNumber)) {
        throw new ApiError(400, "email or phoneNumber is required")
    }
    const user = await User.findOne(
        {$or: [{phoneNumber}, {email}]}).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user,
        "User details fetched successfully by Admin"
    ))
})

const logoutUserByAdmin = asyncHandler(async(req, res) => {

    const {email, phoneNumber} = req.body
    if (!(email || phoneNumber)) {
        throw new ApiError(400, "email or phoneNumber is required")
    }

    await User.findByIdAndUpdate(
        {$or: [{phoneNumber}, {email}]},
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

export {
    registerAdmin,
    updateUserAccountDetailsByAdmin,
    deleteUserByAdmin,
    updateUserprofileImageByAdmin,
    changeUserPasswordByAdmin,
    viewUserDetails,
    logoutUserByAdmin
}