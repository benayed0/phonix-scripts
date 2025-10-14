import { Injectable } from '@nestjs/common';
import * as path from 'path';
import fs from 'fs-extra';
import { FirebaseService } from 'src/services/firebase/firebase.service';
import { User } from 'src/schemas/user/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LocalLogs, Variables } from 'src/interfaces/log.interface';
import { MailService } from 'src/services/mail/mail.service';
import { S3Service } from 'src/services/s3/s3.service';
@Injectable()
export class JobBackupService {
  firebaseVariables = {
    Conseils: { cible: 'technique', level: 1 },
    'Web/Forums/Moderateur': { cible: 'technique', level: 0 },
    'Web/Forums/clinicienPhonix': { cible: 'technique', level: 0 },
    'Web/LiensInstallation': { cible: 'technique', level: 1 },
    'Web/DisponibilityPlugs': { cible: 'technique', level: 0 },
  };
  localeLogs = path.join(process.cwd(), 'error.logs.json');

  constructor(
    private firebase: FirebaseService,
    private mailService: MailService,
    private s3: S3Service,

    @InjectModel(User.name)
    private user: Model<User>,
  ) {}
  async downloadFirebaseAndMongo() {
    let errors = false;
    let data;
    console.log('getting firebase data');

    try {
      data = (await this.firebase.getRef('Production').once('value')).val();
    } catch (error) {
      errors = true;
      console.log(error);
    }
    console.log('running the checkGlobalFirebaseVariables feature ');
    await this.checkGlobalFirebaseVariables(data);
    console.log('finished the checkGlobalFirebaseVariables feature ');
    console.log('running the checkFirebaseUserVariables feature ');
    await this.checkFirebaseUserVariables(data);
    console.log('finished the checkFirebaseUserVariables feature ');

    let allUsers;
    try {
      allUsers = await this.user.find();
      console.log('all users', allUsers.length);
    } catch (error) {
      errors = true;
      console.log(error);
    }
    const date = new Date();
    const today = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const firebasePathMonthName = `${month}-${date.getFullYear()}`;
    const firebasePathDayName = `day${today}`;
    const mongoPathMonthName = `${month}-${date.getFullYear()}`;
    const mongoPathDayName = `day${today}`;
    const actualMonth = new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
    ).getDate();
    const previousMonth = new Date(
      date.getFullYear(),
      date.getMonth(),
      0,
    ).getDate();
    if (today == 1) {
      try {
        await this.s3.uploadFirebaseDB(firebasePathMonthName, data);
        console.log('writing firebase monthly for ' + month);
      } catch (error) {
        console.log(error);
        errors = true;
      }
      try {
        await this.s3.uploadMongoDB(mongoPathMonthName, allUsers);
        const month = date.toLocaleString('default', { month: 'long' });
        console.log('writing mongoDB monthly for ' + month);
      } catch (error) {
        console.log(error);
        errors = true;
      }
      if (previousMonth > actualMonth) {
        for (var i = previousMonth; i <= actualMonth + 1; i++) {
          try {
            await this.s3.deleteFirebaseDB(`day${i}`);
            console.log(`removing firebase day${i}.json`);
          } catch (error) {
            console.log(error);
            errors = true;
          }
          try {
            await this.s3.deleteMongoDB(`day${i}`);
            console.log(`removing mongoDB day${i}.json`);
          } catch (error) {
            console.log(error);
            errors = true;
          }
        }
      }
    }
    try {
      await this.s3.uploadFirebaseDB(firebasePathDayName, data);
      console.log('writing for firebase day ' + today);
    } catch (error) {
      console.log('error uploading firebase data: ', error);
      errors = true;
    }
    try {
      await this.s3.uploadMongoDB(mongoPathDayName, allUsers);
      console.log('writing for mongoDB day ' + today);
    } catch (error) {
      console.log('error uploading mongo data: ', error);
      errors = true;
    }
  }

  async checkGlobalFirebaseVariables(FirebaseData: any) {
    const date = new Date();
    const yesterday = date.getDate() - 1;
    console.log(`checking global firebase variables for day ${yesterday}`);

    const previousFirebase = await this.s3.getFirebaseDB(`day${yesterday}`);

    try {
      if (previousFirebase) {
        for (let key in this.firebaseVariables) {
          const previousObject = JSON.stringify(
            eval(`previousFirebase.${this.extractAttribute(key)}`),
          );
          const actualObject = JSON.stringify(
            eval(`FirebaseData.${this.extractAttribute(key)}`),
          );
          if (actualObject !== previousObject) {
            let difference = '';
            const localjsonObject = eval(
              `previousFirebase.${this.extractAttribute(key)}`,
            );
            const livejsonObject = eval(
              `FirebaseData.${this.extractAttribute(key)}`,
            );
            if (
              Object.keys(localjsonObject).length !==
              Object.keys(livejsonObject).length
            ) {
              difference = Object.keys(livejsonObject).filter(
                (x) => !Object.keys(localjsonObject).includes(x),
              )[0];
            } else {
              const diff = this.getDifference(previousObject, actualObject);
              difference = key + diff;
            }
            let diffObject = {
              bdd: 'Firebase',
              branche: key,
              difference: difference,
              date: this.formatDate(),
            };
            console.log(diffObject);
            if (this.firebaseVariables[key].level == 1) {
              await this.mailService.sendReportEmail(diffObject);
            }
            try {
              let Logs: LocalLogs[] = await fs.readJSON(this.localeLogs);
              Logs.push({
                log: diffObject,
                cible: this.firebaseVariables[key].cible,
              });
              await fs.outputJSON(this.localeLogs, Logs);
            } catch (error) {
              console.log(error);
            }
          }
        }
      } else {
        console.log('No previous Firebase data found for comparison.');
      }
    } catch (error) {
      console.log(error);
    }
  }

  async checkFirebaseUserVariables(FirebaseDataParam: any) {
    const date = new Date();
    const yesterday = date.getDate() - 1;
    const firebasePathDayName = this.s3.getFirebaseDB(`day${yesterday}`);
    let previousFirebase;
    let liveFirebase = FirebaseDataParam.users;
    try {
      previousFirebase = await fs.readJSON(firebasePathDayName);
      previousFirebase = previousFirebase.users;
    } catch (error) {}
    if (previousFirebase) {
      try {
        for (let user in liveFirebase) {
          try {
            for (let key in this.firebaseVariables) {
              let localjsonObject: any;
              let livejsonObject;
              let undefinedObject = false;
              try {
                localjsonObject = previousFirebase[user][key];
                livejsonObject = liveFirebase[user][key];
                if (
                  localjsonObject === undefined &&
                  livejsonObject === undefined
                ) {
                  undefinedObject = true;
                }
              } catch (error) {}
              if (!undefinedObject && localjsonObject !== livejsonObject) {
                const previousObject = JSON.stringify(localjsonObject);
                const actualObject = JSON.stringify(livejsonObject);
                if (actualObject !== previousObject) {
                  let difference = '';
                  if (
                    typeof localjsonObject !== 'string' &&
                    Object.keys(localjsonObject).length !==
                      Object.keys(livejsonObject).length
                  ) {
                    difference = Object.keys(livejsonObject).filter(
                      (x) => !Object.keys(localjsonObject).includes(x),
                    )[0];
                  } else {
                    const diff = this.getDifference(
                      previousObject,
                      actualObject,
                    );
                    difference = key + diff;
                  }
                  let diffObject = {
                    bdd: 'Firebase',
                    branche: key,
                    user: user,
                    name: liveFirebase[user].name,
                    difference: difference,
                    date: this.formatDate(),
                  };
                  if (this.firebaseVariables[key].level == 1) {
                    if (this.firebaseVariables[key].cible === 'technique') {
                      await this.mailService.sendReportEmail(diffObject);
                    } else {
                      await this.mailService.sendReportParentEmail(
                        diffObject,
                        liveFirebase[user].Mail_adresse_proche,
                        liveFirebase[user].Mail_adresse_th,
                      );
                    }
                  }
                  try {
                    let Logs: LocalLogs[] = await fs.readJSON(this.localeLogs);
                    Logs.push({
                      log: diffObject,
                      cible: this.firebaseVariables[key].cible,
                    });
                    await fs.outputJSON(this.localeLogs, Logs);
                  } catch (error) {}
                }
              }
            }
          } catch (error) {}
        }
      } catch (error) {
        console.log(error);
      }
    }
  }

  extractAttribute(variables: string) {
    if (variables.includes('/')) {
      variables = variables.replace(/\//g, '.');
    }
    return variables;
  }
  getDifference(a: string, b: string) {
    const dbString = a.replace(/\//g, '_');
    const localString = b.replace(/\//g, '_');
    var i = 0;
    var j = 0;
    var result = '';
    let lastIndex = [];
    let long = 0;
    let short = 0;
    dbString.length > localString.length
      ? (long = dbString.length)
      : (short = localString.length);
    dbString.length < localString.length
      ? (long = localString.length)
      : (short = dbString.length);
    while (j < long) {
      if (dbString[i] != localString[j] || i == short) {
        result += localString[j];
        lastIndex.push(j);
      } else i++;
      j++;
    }
    let branche = '';
    dbString > localString ? (branche = dbString) : (branche = localString);
    branche = branche.slice(0, lastIndex[lastIndex.length - 1]);
    for (let n = branche.length; n > 0; n--) {
      if (branche[n] == ',' && branche[n - 1] == '}') {
        branche = branche.slice(n + 1, branche.length);
      }
    }
    branche = branche.replace(/\":{"/g, '/');
    branche = branche.replace(/\":"/g, '=>');
    branche = branche.replace(/\{"/g, '/');
    branche = branche.replace(/\"/g, '/');
    let arr = branche.split('=>', 1);
    let finalBranch = arr[0].split('/');
    let testSTR = '/';
    for (let k = 1; k < finalBranch.length - 1; k++) {
      testSTR += finalBranch[k] + '/';
    }

    let arr2 = branche.split('/');
    branche = testSTR + arr2[arr2.length - 1];
    return branche;
  }

  formatDate(date = new Date()) {
    const res = [
      this.padTo2Digits(date.getDate()),
      this.padTo2Digits(date.getMonth() + 1),
      date.getFullYear(),
    ].join('-');
    return res;
  }

  padTo2Digits(num: Number) {
    return num.toString().padStart(2, '0');
  }
}
