const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

router.post('/execute', (req, res) => {
  const { code, input } = req.body;

  const fileName = 'Solution.java';
  const filePath = path.join(__dirname, fileName);
  const classPath = path.join(__dirname, 'Solution.class');

  try {
    // User ka code temporary file mein save karein
    fs.writeFileSync(filePath, code);

    // Local machine par javac aur java command se run karein
    exec(`javac "${filePath}" && java -cp "${__dirname}" Solution`, { timeout: 5000 }, (error, stdout, stderr) => {
      
      // Cleanup files
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      if (fs.existsSync(classPath)) fs.unlinkSync(classPath);

      if (error) {
        return res.json({
          success: true,
          output: '',
          stderr: stderr || error.message
        });
      }

      res.json({
        success: true,
        output: stdout,
        stderr: stderr
      });
    });

  } catch (err) {
    console.error("Execution error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Server internal execution failed." 
    });
  }
});

module.exports = router;