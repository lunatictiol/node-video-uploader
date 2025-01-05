import { asyncHandler } from "../utils/asyncHandler.js";
import Joi from 'joi';
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { deleteFromCLoud, uploadOnCloud } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";



const registerSchema = Joi.object({
  fullname: Joi.string().min(3).max(30).required(),
  email: Joi.string().email({ minDomainSegments: 2 }).required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().required(),
});
const generateAccessAndRefreshTokens = async(userId) =>{
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return {accessToken, refreshToken}


  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating referesh and access token")
  }
}

 const register = asyncHandler(async (req, res) => {
   const {fullname,email,username,password}=req.body
   const { error } = registerSchema.validate({
     fullname,
     email,
     username,
     password
   });
   if (error) {
     throw new ApiError(400, error.details[0].message);
   }
   const existingUser = await User.findOne({ $or:[{email},{username}] })
   if(existingUser){
     throw new ApiError(409, "User with email or username already exists");
   }
   const pfpLocalPath = req.files.profilePicture?.[0]?.path

   const coverPhotoLocalPath = req.files?.coverPhoto?.[0]?.path

   if (!pfpLocalPath){
     throw new ApiError(409, "Profile image cant be empty")

   }
   let pfp
   try {
     pfp = await uploadOnCloud(pfpLocalPath)

   }catch (e) {
     throw new ApiError(500,"failed to upload pfp")

   }

   let coverPhoto
   if(coverPhotoLocalPath) {
     try {
       coverPhoto = await uploadOnCloud(coverPhotoLocalPath)

     } catch (e) {
       throw new ApiError(500, "failed to upload cover image")

     }
   }

   try{
     const user = await User.create({
       fullname: fullname,
       email: email,
       username: username,
       password: password,
       profilePicture: pfp.url,
       coverPhoto: coverPhoto?.url || "",
     });

     const created = await User.findById(user._id).select("-password -refreshToken");
     if (!created) {
       throw new ApiError(500, "something went wrong");

     }

     return res.status(200).json(
       new ApiResponse(200, created, "user registered successfully"),
     );
   }catch (e) {
     if(pfp){
       await deleteFromCLoud(pfp.public_id)
     }
     if (coverPhoto){
       await deleteFromCLoud(coverPhoto.public_id)
     }
     throw new ApiError(500, "something went wrong");

   }

});


const loginUser = asyncHandler(async (req, res) =>{
  const {email, username, password} = req.body
  console.log(email);

  if (!username && !email) {
    throw new ApiError(400, "username or email is required")
  }

  const user = await User.findOne({
    $or: [{username}, {email}]
  })

  if (!user) {
    throw new ApiError(404, "User does not exist")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
  }

  const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser, accessToken, refreshToken
        },
        "User logged In Successfully"
      )
    )

})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )

    const user = await User.findById(decodedToken?._id)

    if (!user) {
      throw new ApiError(401, "Invalid refresh token")
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used")

    }

    const options = {
      httpOnly: true,
      secure: true
    }

    const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {accessToken, refreshToken: newRefreshToken},
          "Access token refreshed"
        )
      )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }

})

const logoutUser = asyncHandler(async(req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1 // this removes the field from document
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

const changeCurrentPassword = asyncHandler(async(req, res) => {
  const {oldPassword, newPassword} = req.body



  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password")
  }

  user.password = newPassword
  await user.save({validateBeforeSave: false})

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
  const {fullName, email} = req.body

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email
      }
    },
    {new: true}

  ).select("-password")

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});




export {
  register,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  updateAccountDetails
}