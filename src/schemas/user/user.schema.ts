import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Schema as MongooseSchema } from 'mongoose';
class Sleep {
  @Prop({ required: false })
  timeToBedToString?: string;

  @Prop({ required: false })
  sleepEndToString?: string;

  @Prop({ required: false })
  timeToBedDurationToString?: string;

  @Prop({ required: false })
  sleepStartToString?: string;

  @Prop({ required: false })
  timeToSleepDurationToString?: string;

  @Prop({ required: false })
  wakeUp1Time?: string;

  @Prop({ required: false })
  wakeUp1Duration?: string;

  @Prop({ required: false })
  wakeUp2Time?: string;

  @Prop({ required: false })
  wakeUp2Duration?: string;

  @Prop({ required: false })
  wakeUp3Time?: string;

  @Prop({ required: false })
  wakeUp3Duration?: string;

  @Prop({ required: false })
  wakeUp4Time?: string;

  @Prop({ required: false })
  wakeUp4Duration?: string;

  @Prop({ required: false })
  wakeUp5Time?: string;

  @Prop({ required: false })
  wakeUp5Duration?: string;
}

@Schema({ _id: false })
class Log {
  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  Smartphone?: any;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  Tablet?: any;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  Computer?: any;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  Console?: any;

  @Prop({ type: Sleep, required: false })
  Sleep?: Sleep;

  @Prop({ required: false })
  stepNumber?: number;
}

export const LogSchema = SchemaFactory.createForClass(Log);

@Schema({ _id: false })
class Survey {
  @Prop({ type: Map, of: Map, required: false })
  ReponseQuestionnaire1?: Map<string, Map<string, any>>;

  @Prop({ type: Map, of: String, required: false })
  ReponseQuestionnaire2?: Map<string, string>;
}

export const surveySchema = SchemaFactory.createForClass(Survey);

@Schema({ versionKey: false })
export class User extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  registrationDate: string;

  @Prop({ type: Map, of: LogSchema, required: true })
  Date: Map<string, typeof LogSchema>;

  @Prop({ type: surveySchema, required: false })
  Survey?: typeof surveySchema;

  @Prop({ required: false })
  token?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
