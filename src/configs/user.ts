export default {
  apiId: process.env.API_ID as string,
  apiHash: process.env.API_HASH as string,
  folderId: +(process.env.USER_FOLDER || '') as number,
  stringSession: process.env.STRING_SESSION as string
};
