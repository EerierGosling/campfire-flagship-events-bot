import sharp from 'sharp';
import path from 'path';

const ASSETS_DIR = path.join(process.cwd(), 'src/assets');

export async function generateProgressImage(args: {
    approvedCount: number,
    completedCount: number
}): Promise<Buffer> {
    const { approvedCount, completedCount } = args;
    
    const composites: sharp.OverlayOptions[] = [];
    
    for (let i = 1; i <= 9; i++) {
        let starPath: string;
        
        if (i <= approvedCount) {
            starPath = path.join(ASSETS_DIR, 'red-star', `${i}.png`);
        } else if (i <= completedCount) {
            starPath = path.join(ASSETS_DIR, 'grey-star', `${i}.png`);
        } else {
            continue;
        }
        
        composites.push({
            input: starPath,
            top: 0,
            left: 0
        });
    }
    
    let bgIndex = 0;
    if (approvedCount >= 9) bgIndex = 5;
    else if (approvedCount >= 6) bgIndex = 4;
    else if (approvedCount >= 4) bgIndex = 3;
    else if (approvedCount >= 2) bgIndex = 2;
    else if (approvedCount >= 1) bgIndex = 1;
    
    composites.unshift({
        input: path.join(ASSETS_DIR, 'background', `${bgIndex}.png`),
        top: 0,
        left: 0
    });
    
    const baseImage = await sharp({
        create: {
            width: 2136,
            height: 1846,
            channels: 4,
            background: { r: 245, g: 247, b: 250, alpha: 1 }
        }
    }).png().toBuffer();
    
    if (composites.length === 0) {
        return baseImage;
    }
    
    return await sharp(baseImage)
        .composite(composites)
        .png()
        .toBuffer();
}
