const fs = require("fs");
const path = require("path");


async function uploadImage(base64Image) {
    try {
        const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
        if (!matches) {
            throw new Error("Invalid base64 image format");
        }

        const ext = matches[1].split("/")[1];
        const data = matches[2];
        const buffer = Buffer.from(data, "base64");
        const fileName = `image_${Date.now()}.${ext}`;
        const filePath = path.join(__dirname, "..", "uploads", fileName);

        await fs.promises.writeFile(filePath, buffer);

        return { success: true, message: "Image uploaded successfully", fileName };

    } catch (err) {
        console.log(err);
        return { success: false, message: "Failed to upload image", error: err.message };
    }
}

module.exports = uploadImage;