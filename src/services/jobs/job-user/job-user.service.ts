import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChallengesImages } from '../../../schemas/challengesImages/challengesImages.schema';
import { LlmService } from 'src/services/llm/llm.service';
import { FirebaseService } from 'src/services/firebase/firebase.service';
@Injectable()
export class JobUserService {
  constructor(
    @InjectModel(ChallengesImages.name)
    private challengesImages: Model<ChallengesImages>,
    private llm: LlmService,
    private firebase: FirebaseService,
  ) {}

  async checkImagesChallenges() {
    const image_challenges_to_check = await this.challengesImages.find();
    console.log(image_challenges_to_check);

    if (image_challenges_to_check.length > 0) {
      for (const challenge of image_challenges_to_check) {
        const { user_id, image_url, consigne, user_challenge_timestamp } =
          challenge;
        await this.AnalyzeImageWithGPT(
          consigne,
          image_url,
          user_id,
          user_challenge_timestamp,
        );
      }
    }
  }

  async AnalyzeImageWithGPT(
    consigne: string,
    image: string,
    user_id: string,
    user_challenge_timestamp: string,
  ): Promise<boolean> {
    try {
      const prompt = `Does this image corresponds approximately to this instructions : ${consigne} ? Respond with only true or false in lowercase, nothing more.`;
      console.log(prompt);
      const image_exists = await this.challengesImages.findOne({
        image_url: image,
      });
      for (let i = 0; i < 3; i++) {
        try {
          const response = await this.llm.sendPhotoToGPT(prompt, image);
          const gpt_response = response.choices[0].message.content.trim();
          if (image_exists) {
            await this.challengesImages.findOneAndDelete({ image_url: image });
          }
          console.log('gpt_response ', gpt_response);
          const pass = gpt_response === 'true';
          if (!pass && image_exists) {
            await this.firebase
              .getRef(
                `Production/users/${user_id}/challengesDone/${user_challenge_timestamp}/cheat/`,
              )
              .set(true);
            await this.firebase
              .getRef(`Production/users/${user_id}/lastCheatReason/`)
              .set(
                'Une triche a été détecté sur la photo du dernier défi avec la consigne : ' +
                  consigne,
              );
          }
          return pass; // If successful, return the result
        } catch (e: any) {
          if (e.response) {
            console.log(e.response);

            if (i === 2) {
              try {
                if (!image_exists) {
                  (
                    await this.challengesImages.create({
                      user_id,
                      user_challenge_timestamp,
                      consigne,
                      image,
                    })
                  ).save();
                }
              } catch (error) {
                console.error('Mongo error:', error);
                return error;
              }
              console.log('GPT-error');
              return false;
            }

            // If it's the third attempt, throw the error
          } else {
            console.log(e.code);
            return e.code;
          }
          // Otherwise, the loop will continue for another try
        }
      }
    } catch (e) {
      return e;
    }
  }
}
