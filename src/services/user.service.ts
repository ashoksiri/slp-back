import { JWT_EXPIRE, JWT_SECRET } from '@/config/config'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import bcrypt from 'bcryptjs';
import { User } from '@/models/user.model'
import { RefreshToken } from '@/models/refresh-token.model';
// const db = require('_helpers/db');

module.exports = {
  authenticate,
  refreshToken,
  revokeToken,
  getAll,
  getById,
  getRefreshTokens
};

//@ts-ignore
async function authenticate({ username, password, ipAddress }) {
  const user = await User.findOne({ username });

  //@ts-ignore
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    throw 'Username or password is incorrect';
  }

  // authentication successful so generate jwt and refresh tokens
  const jwtToken = generateJwtToken(user);
  const refreshToken = generateRefreshToken(user, ipAddress);

  // save refresh token
  await refreshToken.save();

  // return basic details and tokens
  return {
    ...basicDetails(user),
    jwtToken,
    refreshToken: refreshToken.token
  };
}

//@ts-ignore
async function refreshToken({ token, ipAddress }) {
  const refreshToken = await getRefreshToken(token);
  const { user } = refreshToken;

  // replace old refresh token with a new one and save
  const newRefreshToken = generateRefreshToken(user, ipAddress);
  refreshToken.revoked = Date.now();
  refreshToken.revokedByIp = ipAddress;
  refreshToken.replacedByToken = newRefreshToken.token;
  await refreshToken.save();
  await newRefreshToken.save();

  // generate new jwt
  const jwtToken = generateJwtToken(user);

  // return basic details and tokens
  return {
    ...basicDetails(user),
    jwtToken,
    refreshToken: newRefreshToken.token
  };
}

//@ts-ignore
async function revokeToken({ token, ipAddress }) {
  const refreshToken = await getRefreshToken(token);

  // revoke token and save
  refreshToken.revoked = Date.now();
  refreshToken.revokedByIp = ipAddress;
  await refreshToken.save();
}

async function getAll() {
  const users = await User.find();
  //@ts-ignore
  return users.map(x => basicDetails(x));
}

//@ts-ignore
async function getById(id) {
  const user = await getUser(id);
  return basicDetails(user);
}

//@ts-ignore
async function getRefreshTokens(userId) {
  // check that user exists
  await getUser(userId);

  // return refresh tokens for user
  const refreshTokens = await RefreshToken.find({ user: userId });
  return refreshTokens;
}

// helper functions

//@ts-ignore
async function getUser(id) {
  if (!db.isValidId(id)) throw 'User not found';
  const user = await User.findById(id);
  if (!user) throw 'User not found';
  return user;
}

//@ts-ignore
async function getRefreshToken(token) {
  const refreshToken = await RefreshToken.findOne({ token }).populate('user');
  if (!refreshToken || !refreshToken.isActive) throw 'Invalid token';
  return refreshToken;
}

//@ts-ignore
function generateJwtToken(user) {
  // create a jwt token containing the user id that expires in 15 minutes
  return jwt.sign({ sub: user.id, id: user.id }, JWT_SECRET, { expiresIn: '15m' });
}

//@ts-ignore
function generateRefreshToken(user, ipAddress) {
  // create a refresh token that expires in 7 days
  return new RefreshToken({
    user: user.id,
    token: randomTokenString(),
    expires: new Date(Date.now() + 7*24*60*60*1000),
    createdByIp: ipAddress
  });
}

function randomTokenString() {
  return crypto.randomBytes(40).toString('hex');
}

//@ts-ignore
function basicDetails(user) {
  const { id, firstName, lastName, username, role } = user;
  return { id, firstName, lastName, username, role };
}
