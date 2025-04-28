import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCLoudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accesstoken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accesstoken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and acess token")
    }
}


const registerUser = asyncHandler(async (req, res,) => {
    
    // -----> algorithm for register user
    // get user details
    // validation - not empty
    // check if user is already exists: username, email
    // check if images, or avatar is there or not
    // upload them on cloudinary, avatar
    // create user objects - creation entry on db
    // remove password and refresh token filed from response
    // check for user creation
    // return response
    // if not return error


    const {fullName, email, username, password } = req.body
    // console.log("email:" , email); // for testing
    // console.log(req.body); // for study


    if (
        [fullName, email, username, password].
        some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser =  await User.findOne({
        $or: [
            { username },
            { email }
        ]
    })
    
    
    if(existedUser) {
        throw new ApiError(409, "User with email or Username already exists")
    }
    
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    // console.log(req.files); // for study
    
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    // console.log(coverImageLocalPath);


    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCLoudinary(avatarLocalPath);
    const coverImage = await uploadOnCLoudinary(coverImageLocalPath);

    if(!avatar) {
        // console.log(avatar);
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(
            200,
            createdUser,
            "User registered Successfully"
        )
    )

})

const loginUser = asyncHandler(async (req, res) => {

    // ---> todos

    // ---> i do this algorithm by myself <---
    // get details, email/username and password (they should not be empty.)
    // check if these user exists in database
    // if not return user not exist
    // if found the create a refresh token, and acesstoken
    // then redirected to home page.

    // --> by chai aur code < ---
    // req body - data
    // username or email
    // find the user
    // check password
    // acess and refresh token
    // send cookies
    // response that login sucessfully

    const {email, username, password} = req.body

    // if need both
    if(!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    // if need any one email or username
    if(!(username || email)) {
        throw new ApiError(400, "username or email is required")
    }


    const user = await User.findOne({
        $or: [
            {email},
            {username}
        ]
    })

    if(!user) {
        throw new ApiError(404, "user does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid User Credential")
    }

    const {accesstoken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accesstoken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accesstoken, refreshToken
            },
            "User LoggedIn Successfully"
        )
    )

})

const logOutUser = asyncHandler(async(req, res) => {
    
    await User.findByIdAndUpdate(
        req.user._id,
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
    .clearCookie("accessToken", options )
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User Logged Out Successfully")
    )
})

const refreshAccessToken = asyncHandler( async (req, res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const {accesstoken, newrefreshToken} = await generateAccessTokenAndRefreshToken(user._id)
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res
        .status(200)
        .cookie("accessToken", accesstoken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accesstoken,
                    refreshToken: newrefreshToken,
                },
                "Access Token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }

})

export {
    registerUser, 
    loginUser,
    logOutUser,
    refreshAccessToken
}