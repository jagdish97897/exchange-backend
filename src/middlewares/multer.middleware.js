import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp")
  },
  filename: function (req, file, cb) {

    cb(null, file.originalname)
  }
})



export const upload = multer({
  storage: multer.memoryStorage(), // Use memory storage to avoid storing the file on disk
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/jpg', 'image/pdf'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Invalid file type. Please upload an image.'), false);
    }
  },
});