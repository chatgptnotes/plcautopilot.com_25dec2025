const fs = require('fs');
const path = require('path');

const srcPath = 'c:\\Users\\HP\\Downloads\\Template for configuration of cards.smbp';
const destPath = 'd:\\plcautopilot.com_25dec2025 (2)\\plcautopilot.com_25dec2025\\plc_programs\\Tank_Level_RTD_1m_TM221CE40T.smbp';

try {
    let content = fs.readFileSync(srcPath, 'utf8');

    // Replace project name
    content = content.replace(/Template for configuration of cards/g, 'Tank_Level_RTD_1m_TM221CE40T');

    // Replace file path
    content = content.replace(/C:\\Users\\HP\\Downloads\\Template for configuration of cards\.smbp/g, 'D:\\Projects\\Tank_Level_RTD_1m_TM221CE40T.smbp');

    fs.writeFileSync(destPath, content, 'utf8');
    console.log('SUCCESS: Template copied and renamed to Tank_Level_RTD_1m_TM221CE40T.smbp');
} catch (err) {
    console.error('ERROR:', err.message);
}
