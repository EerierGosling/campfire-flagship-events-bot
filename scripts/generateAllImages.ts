import { generateProgressImage } from '../src/util/progressImage';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'generated-images');

async function main() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    for (let approved = 0; approved <= 9; approved++) {
        for (let completed = approved; completed <= 9; completed++) {
            const image = await generateProgressImage({
                approvedCount: approved,
                completedCount: completed
            });
            
            const filename = `progress-${approved}-${completed}.png`;
            fs.writeFileSync(path.join(OUTPUT_DIR, filename), image);
            console.log(`Generated ${filename}`);
        }
    }
    
    console.log(`\nGenerated ${55} images in ${OUTPUT_DIR}`);
}

main();
