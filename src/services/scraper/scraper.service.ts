import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { spawn } from 'child_process';
import { platform } from 'os';

@Injectable()
export class ScraperService {
  constructor() {}

  getWebsite(url: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      if (!url.startsWith('https://')) {
        url = 'https://' + url;
      }
      const isLinux = platform() === 'linux';

      const baseCmd = 'xvfb-run';
      const args = [
        '--auto-servernum',
        "--server-args='-screen 0 1920x1080x24'",
        'python3',
        'scrape.py',
        url,
      ];
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
        if (stderr) {
          console.log('=== Command STDERR ===');
          reject(stderr);
          return;
        }
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
