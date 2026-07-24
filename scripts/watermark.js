const sharp = require('sharp');

const WATERMARK_TEXT = 'blog.diepthink.top';

/**
 * Generate a responsive SVG watermark overlay
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Buffer} - SVG text overlay as Buffer
 */
function generateWatermarkOverlay(width, height) {
    const fontSize = Math.max(14, Math.floor(Math.min(width, height) / 25));
    const paddingX = Math.max(20, Math.floor(width / 30));
    const paddingY = Math.max(20, Math.floor(height / 30));
    
    // We add a subtle dark shadow using filter to keep it readable on white backgrounds
    const svg = `
        <svg width="${width}" height="${height}">
            <defs>
                <filter id="shadow" x="0" y="0" width="120%" height="120%">
                    <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.4"/>
                </filter>
            </defs>
            <style>
                .watermark {
                    fill: rgba(255, 255, 255, 0.35);
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    font-size: ${fontSize}px;
                    font-weight: 600;
                    letter-spacing: 0.05em;
                }
            </style>
            <text 
                x="${width - paddingX}" 
                y="${height - paddingY}" 
                text-anchor="end" 
                class="watermark"
                filter="url(#shadow)"
            >${WATERMARK_TEXT}</text>
        </svg>
    `;
    return Buffer.from(svg);
}

/**
 * Apply visible text watermark to an image
 * @param {string} inputPath - Original image path
 * @param {string} outputPath - Output path (can be same as input for in-place)
 */
async function addWatermark(inputPath, outputPath) {
    try {
        const image = sharp(inputPath);
        const metadata = await image.metadata();
        
        if (!metadata.width || !metadata.height) {
            throw new Error('Failed to retrieve image dimensions');
        }

        const overlay = generateWatermarkOverlay(metadata.width, metadata.height);
        
        await image
            .composite([{ input: overlay, top: 0, left: 0 }])
            .toFile(outputPath + '.temp'); // Write to temp file to support in-place watermarking
            
        // Rename temp file to output path
        const fs = require('fs');
        fs.renameSync(outputPath + '.temp', outputPath);
        
        console.log(`[WATERMARK] Successfully applied watermark to: ${path.relative(process.cwd(), outputPath)}`);
    } catch (err) {
        console.error(`[WATERMARK] Error processing ${inputPath}:`, err.message);
        // Clean up temp file if exists
        const fs = require('fs');
        const tempPath = outputPath + '.temp';
        if (fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch (e) {}
        }
    }
}

module.exports = { addWatermark };
