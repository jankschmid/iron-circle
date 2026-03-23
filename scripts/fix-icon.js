const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function processIcon() {
    console.log("Starting icon processing...");
    // Ensure assets directory exists
    if (!fs.existsSync('assets')) {
        fs.mkdirSync('assets');
    }

    // 1. Create a 1024x1024 solid dark background for the adaptive icon
    await sharp({
        create: {
            width: 1024,
            height: 1024,
            channels: 4,
            background: { r: 18, g: 18, b: 18, alpha: 1 } // #121212 Dark background
        }
    })
        .png()
        .toFile('assets/icon-background.png');
    console.log("Created icon-background.png");

    // 2. Load the SVG, trim the transparent bounding box so we just have the logo
    const svgBuffer = fs.readFileSync('public/assets/logo/Iron-Circle_Logo_Two_Color.svg');

    // We resize it so the longest edge is 650px (the safe zone for Android Adaptive icons is a circle of ~682px diameter inside a 1024 square). 
    // This guarantees the logo will be as large as possible without getting cut off by the circle mask.
    const trimmedLogoBuffer = await sharp(svgBuffer)
        .trim()
        .resize({ width: 650, height: 650, fit: 'inside' })
        .toBuffer();

    console.log("Trimmed and resized foreground SVG.");

    // 3. Composite the perfectly trimmed and scaled logo onto a transparent 1024x1024 canvas
    await sharp({
        create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
        .composite([
            { input: trimmedLogoBuffer, gravity: 'center' }
        ])
        .png()
        .toFile('assets/icon-foreground.png');

    console.log("Created icon-foreground.png");

    // We can remove the old icon.svg that was poorly scaled
    if (fs.existsSync('assets/icon.svg')) {
        fs.unlinkSync('assets/icon.svg');
    }
}

processIcon().catch(e => {
    console.error("Error:", e);
    process.exit(1);
});
