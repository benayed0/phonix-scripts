import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { spawn } from 'child_process';
import { platform } from 'os';

@Injectable()
export class ScraperService {
  constructor(private firebase: FirebaseService) {
    this.getWebsite('https://www.phonixhealth.com/').then((content) => {
      console.log(content);
    });
  }

  getWebsite(url: string) {
    return new Promise((resolve, reject) => {
      const isLinux = platform() === 'linux';

      const baseCmd = isLinux ? 'xvfb-run' : 'python3';
      const args = isLinux
        ? [
            '--auto-servernum',
            '--server-args=-screen 0 1920x1080x24',
            'python3',
            'scrape.py',
            url,
          ]
        : ['scrape.py', url];

      const subprocess = spawn(baseCmd, args, { shell: true });

      let stdout = '';
      let stderr = '';

      subprocess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      subprocess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      subprocess.on('close', (code) => {
        console.log('=== Command STDOUT ===');
        console.log(stdout);
        console.log('=== Command STDERR ===');
        console.log(stderr);
        console.log('=== Command Return Code ===');
        console.log(code);

        try {
          const json = JSON.parse(stdout);
          resolve(json.content);
        } catch (err) {
          console.error('JSON decode error:', err);
          resolve(null); // or reject(err) if you want to propagate the error
        }
      });

      subprocess.on('error', (err) => {
        console.error('Process execution error:', err);
        reject(err);
      });
    });
  }
}
