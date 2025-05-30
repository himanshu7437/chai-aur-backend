import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"
import dotenv from "dotenv"

dotenv.config({
    path: './.env'
})

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});
  

const uploadOnCLoudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;
        // upload the file
        const response = await cloudinary.uploader.upload(
            localFilePath,
            {
                resource_type: "auto"
            }
        )
        
        //file has been upload successfully
        // console.log("File is uploaded on cloudinary", response.url);
        // console.log("File is uploaded on cloudinary", response); // for study
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        console.error("Cloudinary upload error:", error);
        fs.unlinkSync(localFilePath) // remove the locally saved temp file as the upload operation got failed.
        return null;
    }
}

export {uploadOnCLoudinary} 