import mongoose, { Document, model } from 'mongoose'
import IUserModel, { IUser, IUserToAuthJSON } from '@/models/user.model'
const Schema = mongoose.Schema;

export interface IRefreshToken {
  user: IUser
  token: string
  expires: Date,
  created: Date,
  createdByIp: string,
  revoked: Date,
  revokedByIp: string,
  replacedByToken: string
}

export default interface IRefreshTokenModel extends Document, IRefreshToken {
  setPassword(password: string): void
  validPassword(password: string): boolean
  toAuthJSON(): IUserToAuthJSON
  generateJWT(): string
  generateAccessJWT(): string
  name: string
}

const schema = new Schema<IRefreshTokenModel>({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  token: String,
  expires: Date,
  created: { type: Date, default: Date.now },
  createdByIp: String,
  revoked: Date,
  revokedByIp: String,
  replacedByToken: String
});

schema.virtual('isExpired').get(function () {
  return Date.now() >= this.expires;
});

schema.virtual('isActive').get(function () {
  return !this.revoked && !this.isExpired;
});

schema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  //@ts-ignore
  transform: function (doc, ret) {
    // remove these props when object is serialized
    delete ret._id;
    delete ret.id;
    delete ret.user;
  }
});

// module.exports = mongoose.model('RefreshToken', schema);
export const RefreshToken = model<IUserModel>('RefreshToken', schema)
