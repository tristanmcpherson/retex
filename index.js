require('dotenv').config();
const { Client, GatewayIntentBits, Partials, AttachmentBuilder } = require('discord.js');
const latex = require('node-latex');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const pdfToImg = require('pdf-img-convert');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Create a temporary directory for LaTeX output files
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Initialize Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// Regular expressions for detecting LaTeX
// The regex patterns are non-overlapping to prevent double processing
const blockLatexRegex = /\$\$([\s\S]+?)\$\$/g;
const inlineLatexRegex = /(?<!\$)\$([^$]+?)\$(?!\$)/g; // Negative lookbehind and lookahead to avoid matching $$ as $

// Function to render LaTeX to an image
async function renderLatex(latexContent, isBlock = false) {
  // Create a proper LaTeX document with background color and padding
  let document;
  if (isBlock) {
    document = `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{amsfonts}
\\usepackage{physics}
\\usepackage{xcolor}
\\usepackage[margin=0.5cm]{geometry}
\\pagestyle{empty}
\\pagecolor{white}
\\begin{document}
$$${latexContent}$$
\\end{document}`;
  } else {
    document = `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{amsfonts}
\\usepackage{physics}
\\usepackage{xcolor}
\\usepackage[margin=0.5cm]{geometry}
\\pagestyle{empty}
\\pagecolor{white}
\\begin{document}
$${latexContent}$
\\end{document}`;
  }

  console.log("Generated LaTeX document:", document);

  // Create a readable stream from the LaTeX document
  const input = new Readable();
  input.push(document);
  input.push(null);

  // Generate a unique filename
  const filename = `latex_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const pdfPath = path.join(tempDir, `${filename}.pdf`);
  const logPath = path.join(tempDir, `${filename}.log`);

  // Step 1: Generate PDF from LaTeX
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(pdfPath);
    const pdf = latex(input, { cmd: 'pdflatex', passes: 1, errorLogs: logPath });

    pdf.pipe(output);
    pdf.on('error', (error) => {
      console.error('LaTeX Error:', error);
      // Read the log file to get detailed error information
      let errorMessage = 'Error rendering LaTeX.';
      try {
        if (fs.existsSync(logPath)) {
          const logContent = fs.readFileSync(logPath, 'utf8');
          // Extract the relevant error message from the log
          const errorLines = logContent.split('\n').filter(line => 
            line.includes('Error:') || 
            line.includes('!') && !line.includes('!====') && !line.includes('====!')
          );
          
          if (errorLines.length > 0) {
            // Format the error message for Discord
            errorMessage = 'LaTeX Error: ' + errorLines.join('\n').trim();
            // Limit error message length
            if (errorMessage.length > 1000) {
              errorMessage = errorMessage.substring(0, 997) + '...';
            }
          }
          
          // Clean up the log file
          fs.unlinkSync(logPath);
        }
      } catch (logError) {
        console.error('Error reading log file:', logError);
      }
      
      reject(errorMessage);
    });

    output.on('finish', async () => {
      try {
        // Clean up the log file if it exists
        if (fs.existsSync(logPath)) {
          fs.unlinkSync(logPath);
        }
        
        // Step 2: Convert PDF to PNG image with proper cropping and padding
        const pngPath = path.join(tempDir, `${filename}.png`);
        
        // Use ImageMagick's convert to properly crop the image and add padding
        // -trim removes any surrounding whitespace
        // -density 300 sets the DPI for high quality
        // -quality 100 ensures maximum quality
        // -bordercolor white -border 20x10 adds white padding (20px left/right, 10px top/bottom)
        await execPromise(`convert -density 300 -trim +repage -background white -bordercolor white -border 20x10 "${pdfPath}" -quality 100 "${pngPath}"`);
        
        // Clean up the PDF file
        fs.unlinkSync(pdfPath);
        
        resolve(pngPath);
      } catch (error) {
        console.error('PDF to PNG conversion error:', error);
        reject(`Error converting PDF to image: ${error.message}`);
      }
    });
  });
}

// Process message for LaTeX content
async function processMessage(message) {
  // Skip bot messages
  if (message.author.bot) return;

  let content = message.content;
  let hasLatex = false;
  
  // Track which parts of the message have been processed to avoid duplicates
  const processedMatches = new Set();
  
  // Store positions of block LaTeX to remove them later
  const blockPositions = [];

  // First, process block LaTeX ($$...$$)
  const blockMatches = [...content.matchAll(blockLatexRegex)];
  if (blockMatches.length > 0) {
    hasLatex = true;
    
    for (const match of blockMatches) {
      // Create a unique identifier for this match to avoid duplicates
      const matchId = `${match.index}:${match[0]}`;
      
      // Skip if we've already processed this match
      if (processedMatches.has(matchId)) {
        continue;
      }
      
      // Mark as processed
      processedMatches.add(matchId);
      
      // Store the position of this block for later removal
      blockPositions.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[0]
      });
      
      try {
        const latexContent = match[1].trim();
        console.log(`Rendering block LaTeX: ${latexContent}`);
        const imagePath = await renderLatex(latexContent, true);
        const attachment = new AttachmentBuilder(imagePath, { name: 'latex.png' });
        await message.reply({ files: [attachment] });
        // Clean up the file
        fs.unlinkSync(imagePath);
      } catch (error) {
        console.error('Error rendering block LaTeX:', error);
        // Send the specific error message to the user
        await message.reply(typeof error === 'string' ? error : 'Error rendering LaTeX. Please check your syntax.');
      }
    }
  }

  // Remove all block LaTeX from the content before processing inline LaTeX
  let processedContent = content;
  // Sort block positions in reverse order to avoid index shifting when replacing
  blockPositions.sort((a, b) => b.start - a.start);
  for (const pos of blockPositions) {
    processedContent = processedContent.substring(0, pos.start) + 
                       ' '.repeat(pos.content.length) + 
                       processedContent.substring(pos.end);
  }

  // Then, process inline LaTeX ($...$) from the modified content
  const inlineMatches = [...processedContent.matchAll(inlineLatexRegex)];
  if (inlineMatches.length > 0) {
    for (const match of inlineMatches) {
      // Create a unique identifier for this match
      const matchId = `${match.index}:${match[0]}`;
      
      // Skip if we've already processed this match
      if (processedMatches.has(matchId)) {
        continue;
      }
      
      // Mark as processed
      processedMatches.add(matchId);
      hasLatex = true;
      
      try {
        const latexContent = match[1].trim();
        console.log(`Rendering inline LaTeX: ${latexContent}`);
        const imagePath = await renderLatex(latexContent, false);
        const attachment = new AttachmentBuilder(imagePath, { name: 'latex.png' });
        await message.reply({ files: [attachment] });
        // Clean up the file
        fs.unlinkSync(imagePath);
      } catch (error) {
        console.error('Error rendering inline LaTeX:', error);
        // Send the specific error message to the user
        await message.reply(typeof error === 'string' ? error : 'Error rendering LaTeX. Please check your syntax.');
      }
    }
  }

  return hasLatex;
}

// Event listener for when the bot is ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('ReTeX is now online!');
});

// Event listener for messages
client.on('messageCreate', async (message) => {
  try {
    // Process LaTeX in the message
    await processMessage(message);
  } catch (error) {
    console.error('Error processing message:', error);
  }
});

// Login to Discord with the bot token
client.login(process.env.DISCORD_TOKEN);
