import { Client, Account, Avatars, Databases } from 'react-native-appwrite';

export const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('6826cca1001676a5e850')
    .setPlatform('dev.orbital.byteus');

export const account = new Account(client)
export const avatars = new Avatars(client)
export const databases = new Databases(client)
