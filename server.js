// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'frontend')));

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
const isWin = process.platform === 'win32';

app.post('/analyse', (req, res) => {
    const { code, language } = req.body;
    let command, args, tempFile;

    const executeBinary = (execPath, execArgs = []) => {
        const child = spawn(execPath, execArgs);
        let output = '', errors = '';

        child.stdout.on('data', data => output += data.toString());
        child.stderr.on('data', data => errors += data.toString());

        child.on('close', () => {
            res.json({
                output: errors ? `Error detected: ${errors}\nAI Suggestion: Check code logic` : output || 'No syntax/runtime errors detected!'
            });
        });
    };

    if(language === 'python') {
        command = 'python';
        args = [path.join(__dirname, 'python_service', 'analyse.py')];
        const child = spawn(command, args);
        let output = '', errors = '';

        child.stdin.write(code);
        child.stdin.end();

        child.stdout.on('data', data => output += data.toString());
        child.stderr.on('data', data => errors += data.toString());

        child.on('close', () => {
            res.json({ output: output || errors });
        });
    } else if(language === 'javascript') {
        try {
            const child = spawn('node', ['-e', code]);
            let output = '', errors = '';

            child.stdout.on('data', data => output += data.toString());
            child.stderr.on('data', data => errors += data.toString());

            child.on('close', () => {
                res.json({
                    output: errors ? `Error detected: ${errors}\nAI Suggestion: Check JS logic` : output || 'No syntax/runtime errors detected!'
                });
            });
        } catch(e) {
            res.json({ output: `Error detected: ${e}\nAI Suggestion: Check JS logic` });
        }
    } else if(language === 'java') {
        tempFile = path.join(tempDir, 'Main.java');
        fs.writeFileSync(tempFile, code);
        const compile = spawn('javac', [tempFile]);
        let compileErrors = '';

        compile.stderr.on('data', data => compileErrors += data.toString());

        compile.on('close', () => {
            if(compileErrors) {
                res.json({ output: `Error detected: ${compileErrors}\nAI Suggestion: Check Java syntax` });
            } else {
                executeBinary('java', ['-cp', tempDir, 'Main']);
            }
        });
    } else if(language === 'c') {
        tempFile = path.join(tempDir, 'code.c');
        fs.writeFileSync(tempFile, code);
        const exeFile = isWin ? path.join(tempDir, 'code.exe') : path.join(tempDir, 'code.out');
        const compile = spawn('gcc', [tempFile, '-o', exeFile]);
        let compileErrors = '';

        compile.stderr.on('data', data => compileErrors += data.toString());

        compile.on('close', () => {
            if(compileErrors) {
                res.json({ output: `Error detected: ${compileErrors}\nAI Suggestion: Check C syntax` });
            } else {
                executeBinary(exeFile);
            }
        });
    } else {
        res.json({ output: `Language ${language} not supported!` });
    }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
