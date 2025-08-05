import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChallengesImagesDocument = ChallengesImages & Document;

@Schema({ versionKey: false })
export class ChallengesImages {
  @Prop({ required: true })
  image_url: string;

  @Prop({ required: true })
  user_id: string;

  @Prop({ required: true })
  consigne: string;

  @Prop({ required: true })
  user_challenge_timestamp: string;
}

export const ChallengesImagesSchema =
  SchemaFactory.createForClass(ChallengesImages);
