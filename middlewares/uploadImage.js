export const uploadImageFunc = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Please upload an image" });
        }
        const imageUrl = req.file.path;
        return res.status(201).json({ 
            message: "Image uploaded successfully", 
            imageUrl 
        });
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: error.message });
    }
};