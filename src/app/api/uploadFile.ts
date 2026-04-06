import { supabase } from "../libs/supabaseClient";

const uploadFile = async (file: File): Promise<string | null> => {
    try {
        if (!file) return null;

        const fileName = `${Date.now()}-${file.name}`;

        const { data, error } = await supabase.storage
            .from("image products")
            .upload(fileName, file);

        if (error) {
            console.error("Upload error:", error.message);
            return null;
        }

        const { data: publicData } = supabase.storage
            .from("image products")
            .getPublicUrl(data.path);

        return publicData.publicUrl;
    } catch (err: any) {
        console.error("Unexpected error:", err?.message);
        return null;
    }
};
export default uploadFile;
