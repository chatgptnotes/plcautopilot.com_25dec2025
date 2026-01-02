/**
 * Minimal test - just copy template with project name change
 * This tests if the basic copy and simple replace works
 */

const fs = require('fs');

const TEMPLATE_PATH = 'c:\\Users\\HP\\Downloads\\Template for configuration of cards.smbp';
const OUTPUT_PATH = 'd:\\plcautopilot.com_25dec2025 (2)\\plcautopilot.com_25dec2025\\plc_programs\\Test_Minimal_Copy.smbp';

try {
    console.log('Reading template as binary buffer...');
    const buffer = fs.readFileSync(TEMPLATE_PATH);

    console.log('Template file size:', buffer.length, 'bytes');
    console.log('First 3 bytes (BOM check):', buffer[0], buffer[1], buffer[2]);

    // Check for UTF-8 BOM
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        console.log('UTF-8 BOM detected - GOOD');
    } else {
        console.log('WARNING: No UTF-8 BOM detected');
    }

    // Convert to string
    let content = buffer.toString('utf8');

    // Only change project name - nothing else
    console.log('Replacing project name only...');
    content = content.split('Template for configuration of cards').join('Test_Minimal_Copy');

    // Write back
    console.log('Writing output file...');
    fs.writeFileSync(OUTPUT_PATH, content, 'utf8');

    // Verify output
    const outBuffer = fs.readFileSync(OUTPUT_PATH);
    console.log('Output file size:', outBuffer.length, 'bytes');
    console.log('First 3 bytes:', outBuffer[0], outBuffer[1], outBuffer[2]);

    console.log('');
    console.log('SUCCESS: Minimal copy created');
    console.log('Output:', OUTPUT_PATH);
    console.log('');
    console.log('Please test this file in Machine Expert Basic.');
    console.log('If this works, the template is valid and we can add more changes.');

} catch (err) {
    console.error('ERROR:', err.message);
}
