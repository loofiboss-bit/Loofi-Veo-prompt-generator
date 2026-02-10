
import { Shot, CharacterProfile } from '@core/types';

/**
 * Generates an FCPXML 1.10 document from the storyboard shots.
 * Maps prompts to Notes and Characters to Keywords.
 */
export const generateFCPXML = (
    shots: Shot[], 
    characterBank: CharacterProfile[],
    projectTitle: string = "Veo_Timeline",
    fps: number = 24
): string => {
    // FCPXML Constants
    const frameDuration = `100/${fps * 100}s`; // e.g. "100/2400s" which simplifies to 1/24s logic
    const tcFormat = "NDF"; // Non-Drop Frame

    // 1. Resources Section (Assets)
    // We filter only shots that have video URLs
    const validShots = shots.filter(s => s.generatedVideoUrl);
    
    let resourcesXml = '';
    validShots.forEach((shot, index) => {
        // We assume the ZIP export naming convention: clip_{index+1}.mp4
        const filename = `clip_${(index + 1).toString().padStart(3, '0')}.mp4`;
        const id = `r${index + 1}`;
        // Standard Veo preview duration is often approx 5s, but we map strictly to shot duration
        const durationFrames = (shot.duration || 5) * fps;
        const durationStr = `${durationFrames * 100}/${fps * 100}s`;

        resourcesXml += `
        <asset id="${id}" name="${filename}" uid="${id}" src="./${filename}" start="0s" duration="${durationStr}" hasVideo="1" format="r1" />`;
    });

    // 2. Sequence/Spine Section
    let spineXml = '';
    let currentOffsetFrames = 0;

    validShots.forEach((shot, index) => {
        const id = `r${index + 1}`;
        const durationFrames = (shot.duration || 5) * fps;
        const durationStr = `${durationFrames * 100}/${fps * 100}s`;
        const offsetStr = `${currentOffsetFrames * 100}/${fps * 100}s`;
        
        // Resolve Character Name
        const charName = characterBank.find(c => c.id === shot.characterId)?.name || 'Unknown Actor';
        
        // Sanitize Strings for XML
        const note = (shot.action || "").replace(/[<>&'"]/g, '');
        const keyword = charName.replace(/[<>&'"]/g, '');

        spineXml += `
            <asset-clip name="Shot ${index + 1}" ref="${id}" offset="${offsetStr}" duration="${durationStr}" start="0s">
                <note>${note}</note>
                <keyword start="0s" duration="${durationStr}" value="${keyword}" />
            </asset-clip>`;
        
        currentOffsetFrames += durationFrames;
    });

    const totalDurationStr = `${currentOffsetFrames * 100}/${fps * 100}s`;

    // 3. Construct Final XML
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.10">
    <resources>
        <format id="r1" name="FFVideoFormat1080p${fps}" frameDuration="${frameDuration}" width="1920" height="1080" colorSpace="1-1-1 (Rec. 709)"/>
        ${resourcesXml}
    </resources>
    <library>
        <event name="${projectTitle}">
            <project name="${projectTitle}">
                <sequence format="r1" duration="${totalDurationStr}" tcStart="0s" tcFormat="${tcFormat}" audioLayout="stereo" audioRate="48000">
                    <spine>
                        ${spineXml}
                    </spine>
                </sequence>
            </project>
        </event>
    </library>
</fcpxml>`;
};
