import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinaryUpload } from "./cloudinary.config";

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Invalid file type"));
  }

  cb(null, true);
};

const storage = new CloudinaryStorage({
  cloudinary: cloudinaryUpload,

  params: async (req, file) => {
    const extension = path
      .extname(file.originalname)
      .replace(".", "")
      .toLowerCase();

    const baseName = path
      .basename(file.originalname, path.extname(file.originalname))
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const uniqueName = `${randomUUID()}-${baseName}`;

    const imageExtensions = ["jpg", "jpeg", "png", "gif"];
    const docExtensions = ["pdf", "docx"];

    let folder = "others";

    if (imageExtensions.includes(extension)) {
      folder = "images";
    } else if (docExtensions.includes(extension)) {
      folder = "documents";
    }

    return {
      folder: `ph-healthcare/${folder}`,
      public_id: uniqueName,
      resource_type: "auto",
    };
  },
});

export const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
