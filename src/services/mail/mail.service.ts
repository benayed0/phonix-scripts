import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, SendEmailV3_1, LibraryResponse } from 'node-mailjet';

@Injectable()
export class MailService {
  client = new Client({
    apiKey: this.config.get('MAILJET_USER'),
    apiSecret: this.config.get('MAILJET_PASSWORD'),
  });
  phonixTeam = [
    { Email: 'benayed.aziz.98@gmail.com' },
    { Email: 'islam.eb@hotmail.fr' },
  ];
  constructor(private config: ConfigService) {}
  async sendReportEmail(diffObject: any) {
    try {
      const result: LibraryResponse<SendEmailV3_1.Response> = await this.client
        .post('send', { version: 'v3.1' })
        .request({
          Messages: [
            {
              From: {
                Email: 'feedback@phonixhealth.com',
                Name: 'Phonix Health',
              },
              To: this.phonixTeam,
              TemplateErrorReporting: {
                Email: 'benayed.aziz.98@gmail.com',
                Name: 'AZIZ',
              },
              Variables: diffObject,
              Subject: `Alerte changement dans la BDD ${diffObject.bdd}`,
              TemplateID: 3917546,
              TemplateLanguage: true,
            },
          ],
        });
      console.log(result.body.Messages[0].Status);
    } catch (error) {
      console.log(error);

      return error;
    }
    return true;
  }
  async sendReportParentEmail(
    diffObject: any,
    parentEmail: string,
    doctorEmail: string,
  ) {
    /**
     *
     * This call sends a message to the given recipient with vars and custom vars.
     *
     */

    try {
      const result: LibraryResponse<SendEmailV3_1.Response> = await this.client
        .post('send', { version: 'v3.1' })
        .request({
          Messages: [
            {
              From: {
                Email: 'feedback@phonixhealth.com',
                Name: 'Phonix Health',
              },
              To: [{ Email: parentEmail }, { Email: doctorEmail }],
              TemplateErrorReporting: {
                Email: 'benayed.aziz.98@gmail.com',
                Name: 'AZIZ',
              },
              Variables: {
                name: diffObject.name,
                branche: diffObject.branche,
                date: diffObject.date,
              },
              Subject: `Alerte changement des données de ${diffObject.name}`,
              TemplateID: 3916447,
              TemplateLanguage: true,
            },
          ],
        });
      console.log(result.body.Messages[0].Status);
    } catch (error) {
      console.log(error);

      return error;
    }
    return true;
  }
}
