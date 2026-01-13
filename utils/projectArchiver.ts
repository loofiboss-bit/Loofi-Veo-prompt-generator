
import JSZip from 'jszip';
import { Project, Asset, PromptState, CharacterProfile, LocationProfile, StoryboardState, VisualDNA } from '../types';

interface ProjectArchive {
    version: string;
    timestamp: number;
    project: Project;
    assets: Asset[];
}

/**
 * Helper to convert Base64 string to Blob
 */
const base64ToBlob = async (base64Data: string, contentType: string): Promise<Blob> => {
    const response = await fetch(`data:${contentType};base64,${base64Data}`);
    return await response.blob();
};

/**
 * Helper to convert Blob/File to Base64
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g. "data:image/png;base64,")
            resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const exportProjectToZip = async (
    project: Project, 
    globalAssets: Asset[]
): Promise<Blob> => {
    const zip = new JSZip();
    const assetsFolder = zip.folder("assets");
    
    if (!assetsFolder) throw new Error("Failed to create assets folder in zip");

    // Clone data to avoid mutating state
    const processedAssets: Asset[] = JSON.parse(JSON.stringify(globalAssets));
    
    // 1. Process Global Assets (Extract Base64 to Files)
    for (let i = 0; i < processedAssets.length; i++) {
        const asset = processedAssets[i];
        if (asset.data) {
            const ext = asset.mimeType.split('/')[1] || 'bin';
            const filename = `${asset.id}.${ext}`;
            
            // Add file to zip
            assetsFolder.file(filename, asset.data, { base64: true });
            
            // Lighten the JSON payload
            asset.data = ''; 
            asset.url = `assets/${filename}`; // Relative reference
        }
    }

    // 2. Construct Archive Object
    const archive: ProjectArchive = {
        version: '1.0',
        timestamp: Date.now(),
        project: project,
        assets: processedAssets
    };

    // 3. Save JSON
    zip.file("project.json", JSON.stringify(archive, null, 2));

    // 4. Generate Zip
    return await zip.generateAsync({ type: "blob" });
};

export const importProjectFromZip = async (
    file: File
): Promise<{ project: Project; assets: Asset[] }> => {
    const zip = await JSZip.loadAsync(file);
    
    const jsonFile = zip.file("project.json");
    if (!jsonFile) throw new Error("Invalid .veo file: project.json missing");

    const jsonStr = await jsonFile.async("string");
    const archive: ProjectArchive = JSON.parse(jsonStr);

    const restoredAssets: Asset[] = [];

    // Rehydrate Assets
    if (archive.assets && Array.isArray(archive.assets)) {
        for (const asset of archive.assets) {
            // Check if it was externalized to the zip
            if (asset.url.startsWith('assets/')) {
                const zipFile = zip.file(asset.url);
                if (zipFile) {
                    // Read binary
                    const blob = await zipFile.async("blob");
                    // Re-create Blob URL for session
                    const newUrl = URL.createObjectURL(blob);
                    // Re-create Base64 for storage persistence
                    const base64 = await blobToBase64(blob);
                    
                    restoredAssets.push({
                        ...asset,
                        url: newUrl,
                        data: base64
                    });
                } else {
                    console.warn(`Asset file missing in zip: ${asset.url}`);
                }
            } else {
                // Legacy or inline asset
                restoredAssets.push(asset);
            }
        }
    }

    return {
        project: archive.project,
        assets: restoredAssets
    };
};
